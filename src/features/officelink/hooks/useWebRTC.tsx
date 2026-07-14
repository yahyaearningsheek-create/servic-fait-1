import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface P2PMessage {
  id: string;
  senderId: string;
  senderEmail: string;
  text: string;
  timestamp: string;
  isFile?: boolean;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  progress: number; // 0 to 100
  speed: number; // Bytes/sec
  timeRemaining: number; // Seconds
  status: 'pending_accept' | 'transferring' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'rejected' | 'calculating_sha256' | 'verifying_sha256';
  isIncoming: boolean;
  senderEmail: string;
  peerId: string;
  priority?: 'high' | 'normal' | 'low';
  sha256?: string;
  startTime?: number;
  offset?: number;
  lastUpdate?: number;
  fileDataUrl?: string;
  lastAckedSegment?: number;
}

export interface PeerMeta {
  email: string;
  nom_appareil: string;
  systeme_exploitation: string;
  ip_locale: string;
}

export interface WebRTCContextType {
  messages: P2PMessage[];
  peers: string[];
  onlinePeers: string[];
  peerMetadata: { [clientId: string]: PeerMeta };
  activeTransfers: FileTransfer[];
  connectionStatus: { [clientId: string]: 'connecting' | 'connected' | 'failed' };
  broadcastMessage: (text: string) => void;
  sendFile: (targetClientId: string, file: File, priority?: 'high' | 'normal' | 'low') => void;
  acceptTransfer: (transferId: string) => void;
  rejectTransfer: (transferId: string) => void;
  pauseTransfer: (transferId: string) => void;
  resumeTransfer: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;
  connectToPeer: (clientId: string) => Promise<void>;
  isPeerConnected: (clientId: string) => boolean;
  downloadDirectoryHandle: any | null;
  selectDownloadDirectory: () => Promise<void>;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

// Helpers for size formatting
export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Detect OS
export function getOS(): string {
  const ua = window.navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Inconnu';
}

// Generate a stable Client ID per browser tab session
function getSessionClientId(): string {
  const stored = sessionStorage.getItem('officelink_client_id');
  if (stored) return stored;
  const id = `client-${crypto.randomUUID()}`;
  sessionStorage.setItem('officelink_client_id', id);
  return id;
}

// Generate a stable-ish local IP mock per session
export function getLocalIPMock(): string {
  const stored = sessionStorage.getItem('officelink_ip_mock');
  if (stored) return stored;
  const ip = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
  sessionStorage.setItem('officelink_ip_mock', ip);
  return ip;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const MAX_RETRY = 3;
const RETRY_DELAY = 2000; // ms
const DEFAULT_SEGMENT_SIZE = 2 * 1024 * 1024; // 2MB default

export function WebRTCProvider({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [onlinePeers, setOnlinePeers] = useState<string[]>([]);
  const [peerMetadata, setPeerMetadata] = useState<{ [clientId: string]: PeerMeta }>({});
  const [activeTransfers, setActiveTransfers] = useState<FileTransfer[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{ [clientId: string]: 'connecting' | 'connected' | 'failed' }>({});
  const [downloadDirectoryHandle, setDownloadDirectoryHandle] = useState<any | null>(null);

  const selectDownloadDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert("Votre navigateur ne supporte pas l'enregistrement direct dans un dossier (API File System). Le téléchargement se fera dans le dossier par défaut de votre navigateur.");
        return;
      }
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      setDownloadDirectoryHandle(handle);
    } catch (err) {
      console.warn("Sélection de dossier annulée ou erreur", err);
    }
  };

  // === REFS for stable references (prevents useEffect dependency loops) ===
  const peerConnections = useRef<{ [clientId: string]: RTCPeerConnection }>({});
  const dataChannels = useRef<{ [clientId: string]: RTCDataChannel }>({});
  const channelRef = useRef<any>(null);
  const retryCount = useRef<{ [clientId: string]: number }>({});
  const connectingPeers = useRef<Set<string>>(new Set());
  const knownPeers = useRef<Set<string>>(new Set());

  // File Transfer Refs
  const activeTransfersRef = useRef<{ [transferId: string]: FileTransfer }>({});
  const filesToSend = useRef<{ [transferId: string]: File }>({});
  const receivedChunks = useRef<{ [transferId: string]: Uint8Array[] }>({});
  const lastHeartbeatReceived = useRef<{ [clientId: string]: number }>({});
  const segmentSizeRef = useRef<{ [transferId: string]: number }>({});
  const connectionTimeouts = useRef<{ [peerId: string]: NodeJS.Timeout }>({});

  const myId = session?.user?.id;
  const myEmail = session?.user?.email;
  const myClientId = useRef(getSessionClientId());

  // Store current values in refs so callbacks always have fresh data
  const myIdRef = useRef(myId);
  const myEmailRef = useRef(myEmail);

  useEffect(() => {
    myIdRef.current = myId;
    myEmailRef.current = myEmail;
  }, [myId, myEmail]);

  const syncTransferList = useCallback(() => {
    setActiveTransfers(Object.values(activeTransfersRef.current));
  }, []);

  const getSegmentSize = (speedBytesPerSec: number): number => {
    const MB = 1024 * 1024;
    if (speedBytesPerSec > 5 * MB) return 4 * MB; // 4MB
    if (speedBytesPerSec < 500 * 1024) return 1 * MB; // 1MB
    return 2 * MB; // 2MB default
  };

  const calculateSHA256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Queue orchestrator
  const processQueue = useCallback(() => {
    const transfers: FileTransfer[] = Object.values(activeTransfersRef.current);
    const transferring = transfers.some(t => t.status === 'transferring');
    if (transferring) return; // Wait for active to finish

    // Find highest priority queued transfer
    const nextTransfer = transfers
      .filter(t => t.status === 'paused' || (t.status === 'pending_accept' && !t.isIncoming && t.sha256))
      .sort((a, b) => {
        const prioVal = { high: 3, normal: 2, low: 1 };
        const valA = prioVal[a.priority || 'normal'];
        const valB = prioVal[b.priority || 'normal'];
        return valB - valA;
      })[0];

    if (nextTransfer) {
      if (nextTransfer.status === 'paused') {
        const dc = dataChannels.current[nextTransfer.peerId];
        if (dc && dc.readyState === 'open') {
          activeTransfersRef.current[nextTransfer.id] = { 
            ...nextTransfer, 
            status: 'transferring', 
            lastUpdate: Date.now() 
          };
          syncTransferList();
          dc.send(JSON.stringify({ type: 'file-resume', payload: { transferId: nextTransfer.id } }));
          if (!nextTransfer.isIncoming) {
            sendNextChunkRef.current(nextTransfer.id);
          }
        }
      }
    }
  }, [syncTransferList]);

  // Async receiver verification
  const verifyAndCompleteTransfer = async (transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (!transfer) return;

    activeTransfersRef.current[transferId] = { ...transfer, status: 'verifying_sha256' };
    syncTransferList();

    const allChunks = receivedChunks.current[transferId];
    if (!allChunks) return;

    // Combine all chunks into one Uint8Array
    const totalLength = allChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of allChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Calculate SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (calculatedHash === transfer.sha256) {
      const blob = new Blob(allChunks, { type: transfer.fileType });
      const url = URL.createObjectURL(blob);

      activeTransfersRef.current[transferId] = {
        ...transfer,
        status: 'completed',
        offset: totalLength,
        progress: 100,
        fileDataUrl: url
      };
      syncTransferList();
      delete receivedChunks.current[transferId];

      // Auto download direct to folder if selected, otherwise fallback to standard download
      if (downloadDirectoryHandle && transfer.isIncoming) {
        try {
          const newFileHandle = await downloadDirectoryHandle.getFileHandle(transfer.fileName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log("Fichier enregistré directement dans le dossier :", transfer.fileName);
        } catch (err) {
          console.error("Erreur d'écriture dans le dossier choisi. Utilisation du téléchargement classique.", err);
          const a = document.createElement('a');
          a.href = url;
          a.download = transfer.fileName;
          a.click();
        }
      } else if (transfer.isIncoming) {
        const a = document.createElement('a');
        a.href = url;
        a.download = transfer.fileName;
        a.click();
      }

      // Log activity
      const duration = ((Date.now() - (transfer.startTime || Date.now())) / 1000).toFixed(1);
      const myIP = getLocalIPMock();
      const peerIP = peerMetadata[transfer.peerId]?.ip_locale || 'Inconnue';
      try {
        await supabase.from('activity_logs').insert({
          user_id: myIdRef.current,
          action: 'RECEPTION_FICHIER',
          description: `Réception de "${transfer.fileName}" (${formatSize(transfer.fileSize)}) réussie. IP Source: ${peerIP}, IP Dest: ${myIP}, Durée: ${duration}s, SHA-256: Valide (${calculatedHash.substring(0, 8)}).`
        });
      } catch {}
      
      processQueue();
    } else {
      activeTransfersRef.current[transferId] = {
        ...transfer,
        status: 'failed'
      };
      syncTransferList();
      delete receivedChunks.current[transferId];
      alert(`Erreur de validation de signature pour le fichier ${transfer.fileName}. Le fichier reçu est corrompu.`);
      processQueue();
    }
  };

  // ---- sendNextChunk (ref-based to avoid stale closures) ----
  const sendNextChunkRef = useRef<(transferId: string) => void>(() => {});
  sendNextChunkRef.current = (transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (!transfer || transfer.status !== 'transferring') return;

    const file = filesToSend.current[transferId];
    if (!file) return;

    const offset = transfer.offset || 0;
    const CHUNK_SIZE = 16384; // 16KB
    const segmentSize = segmentSizeRef.current[transferId] || DEFAULT_SEGMENT_SIZE;

    // Segment boundaries
    const currentSegment = Math.floor(offset / segmentSize);
    const nextSegmentBoundary = (currentSegment + 1) * segmentSize;

    const slice = file.slice(offset, offset + CHUNK_SIZE);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const base64Data = arrayBufferToBase64(arrayBuffer);

      const peerId = transfer.peerId;
      const dc = dataChannels.current[peerId];
      if (dc && dc.readyState === 'open') {
        dc.bufferedAmountLowThreshold = 65536;

        if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
          dc.onbufferedamountlow = () => {
            dc.onbufferedamountlow = null;
            sendNextChunkRef.current(transferId);
          };
          return;
        }

        try {
          dc.send(JSON.stringify({
            type: 'file-chunk',
            payload: { transferId, offset, data: base64Data }
          }));
        } catch (sendErr) {
          console.error("Erreur envoi chunk:", sendErr);
          activeTransfersRef.current[transferId] = { ...transfer, status: 'failed' };
          syncTransferList();
          processQueue();
          return;
        }

        const newOffset = offset + arrayBuffer.byteLength;
        const progress = Math.min(100, Math.round((newOffset / transfer.fileSize) * 100));

        const now = Date.now();
        const lastUpdate = transfer.lastUpdate || now;
        const timeDelta = (now - lastUpdate) / 1000 || 0.001;
        const bytesDelta = newOffset - (transfer.offset || 0);
        const speed = Math.round(bytesDelta / timeDelta);
        const timeRemaining = Math.max(0, Math.round((transfer.fileSize - newOffset) / (speed || 1)));

        // Adapt segment size dynamically based on speed
        segmentSizeRef.current[transferId] = getSegmentSize(speed);

        const updatedTransfer: FileTransfer = {
          ...transfer,
          offset: newOffset,
          progress,
          speed,
          timeRemaining,
          lastUpdate: now,
        };

        const isEndOfSegment = newOffset >= nextSegmentBoundary && newOffset < transfer.fileSize;

        if (newOffset >= transfer.fileSize) {
          // Finished sending, set status to pending final verification by receiver
          activeTransfersRef.current[transferId] = {
            ...updatedTransfer,
            status: 'completed'
          };
          syncTransferList();
          delete filesToSend.current[transferId];

          // Detailed activity log
          const duration = ((Date.now() - (transfer.startTime || Date.now())) / 1000).toFixed(1);
          const myIP = getLocalIPMock();
          const peerIP = peerMetadata[transfer.peerId]?.ip_locale || 'Inconnue';
          try {
            await supabase.from('activity_logs').insert({
              user_id: myIdRef.current,
              action: 'ENVOI_FICHIER',
              description: `Envoi de "${transfer.fileName}" (${formatSize(transfer.fileSize)}) réussi. IP Source: ${myIP}, IP Dest: ${peerIP}, Durée: ${duration}s, SHA-256: ${transfer.sha256}.`
            });
          } catch {}

          processQueue();
        } else if (isEndOfSegment) {
          // Pause sending chunks and wait for segment ACK
          activeTransfersRef.current[transferId] = {
            ...updatedTransfer,
            status: 'paused', // Treat as paused/waiting for ACK
            lastAckedSegment: currentSegment
          };
          syncTransferList();
        } else {
          // Continue within current segment
          activeTransfersRef.current[transferId] = updatedTransfer;
          syncTransferList();
          sendNextChunkRef.current(transferId);
        }
      } else {
        activeTransfersRef.current[transferId] = { ...transfer, status: 'failed' };
        syncTransferList();
        processQueue();
      }
    };
    reader.readAsArrayBuffer(slice);
  };

  // ---- handleReceiveMessage (ref-based) ----
  const handleReceiveMessageRef = useRef<(event: MessageEvent, peerId: string) => void>(() => {});
  handleReceiveMessageRef.current = async (event: MessageEvent, peerId: string) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'chat-message') {
        const chatMsg: P2PMessage = msg.payload;
        setMessages(prev => {
          if (prev.find(m => m.id === chatMsg.id)) return prev;
          return [...prev, chatMsg];
        });
      } 
      
      else if (msg.type === 'file-metadata') {
        const { transferId, fileName, fileSize, fileType, senderEmail, priority, sha256 } = msg.payload;
        const newTransfer: FileTransfer = {
          id: transferId, fileName, fileSize, fileType,
          progress: 0, speed: 0, timeRemaining: 0,
          status: 'pending_accept', isIncoming: true,
          senderEmail, peerId, priority, sha256,
          startTime: Date.now()
        };
        activeTransfersRef.current[transferId] = newTransfer;
        syncTransferList();

        // Browser notification for cross-tab visibility
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification('📁 Nouveau fichier reçu — OfficeLink', {
              body: `${senderEmail} vous envoie "${fileName}" (${formatSize(fileSize)}).\nCliquez pour accepter ou refuser.`,
              icon: '/logo.jpeg',
              tag: transferId,
              requireInteraction: true
            });
            n.onclick = () => { window.focus(); n.close(); };
          }
        } catch (e) { /* Notifications not supported */ }
      } 
      
      else if (msg.type === 'file-accept') {
        const { transferId } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (transfer) {
          activeTransfersRef.current[transferId] = {
            ...transfer, 
            status: 'transferring', 
            offset: 0, 
            lastUpdate: Date.now(), 
            startTime: Date.now(),
            lastAckedSegment: -1
          };
          syncTransferList();
          sendNextChunkRef.current(transferId);
        }
      } 
      
      else if (msg.type === 'file-reject') {
        const { transferId } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (transfer) {
          activeTransfersRef.current[transferId] = { ...transfer, status: 'rejected' };
          syncTransferList();
          processQueue();
        }
      }

      else if (msg.type === 'file-pause') {
        const { transferId } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (transfer) {
          activeTransfersRef.current[transferId] = { ...transfer, status: 'paused' };
          syncTransferList();
        }
      }

      else if (msg.type === 'file-resume') {
        const { transferId, offset } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (transfer) {
          const targetOffset = offset !== undefined ? offset : (transfer.offset || 0);
          activeTransfersRef.current[transferId] = { 
            ...transfer, 
            status: 'transferring', 
            offset: targetOffset,
            lastUpdate: Date.now() 
          };
          syncTransferList();
          
          if (transfer.isIncoming) {
            // Truncate received chunks to sync with the resumed offset
            const expectedChunksCount = Math.floor(targetOffset / 16384);
            if (receivedChunks.current[transferId]) {
              receivedChunks.current[transferId] = receivedChunks.current[transferId].slice(0, expectedChunksCount);
            }
          } else {
            sendNextChunkRef.current(transferId);
          }
        }
      }

      else if (msg.type === 'file-cancel') {
        const { transferId } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (transfer) {
          activeTransfersRef.current[transferId] = { ...transfer, status: 'cancelled' };
          syncTransferList();
          if (transfer.isIncoming) {
            delete receivedChunks.current[transferId];
          } else {
            delete filesToSend.current[transferId];
          }
          processQueue();
        }
      }

      else if (msg.type === 'file-segment-ack') {
        const { transferId, segmentIndex, nextOffset } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (transfer) {
          activeTransfersRef.current[transferId] = {
            ...transfer,
            status: 'transferring', // Resume transferring
            offset: nextOffset,
            lastAckedSegment: segmentIndex,
            lastUpdate: Date.now()
          };
          syncTransferList();
          if (!transfer.isIncoming) {
            sendNextChunkRef.current(transferId);
          }
        }
      }

      else if (msg.type === 'file-chunk') {
        const { transferId, offset, data } = msg.payload;
        const transfer = activeTransfersRef.current[transferId];
        if (!transfer || (transfer.status !== 'transferring' && transfer.status !== 'paused')) return;

        if (!receivedChunks.current[transferId]) {
          receivedChunks.current[transferId] = [];
        }

        const chunkBytes = base64ToUint8Array(data);
        receivedChunks.current[transferId].push(chunkBytes);

        const currentBytes = (transfer.offset || 0) + chunkBytes.length;
        const progress = Math.min(100, Math.round((currentBytes / transfer.fileSize) * 100));

        const now = Date.now();
        const lastUpdate = transfer.lastUpdate || now;
        const timeDelta = (now - lastUpdate) / 1000 || 0.001;
        const speed = Math.round(chunkBytes.length / timeDelta);
        const timeRemaining = Math.max(0, Math.round((transfer.fileSize - currentBytes) / (speed || 1)));

        const segmentSize = segmentSizeRef.current[transferId] || DEFAULT_SEGMENT_SIZE;
        const currentSegment = Math.floor(currentBytes / segmentSize);
        const prevSegment = Math.floor((transfer.offset || 0) / segmentSize);
        const isEndOfSegment = currentSegment > prevSegment && currentBytes < transfer.fileSize;

        const updatedTransfer: FileTransfer = {
          ...transfer,
          offset: currentBytes, 
          progress, 
          speed, 
          timeRemaining,
          lastUpdate: now,
          status: isEndOfSegment ? 'paused' : 'transferring'
        };

        activeTransfersRef.current[transferId] = updatedTransfer;
        syncTransferList();

        // Send Segment ACK if we hit a boundary
        if (isEndOfSegment) {
          const dc = dataChannels.current[peerId];
          if (dc && dc.readyState === 'open') {
            dc.send(JSON.stringify({
              type: 'file-segment-ack',
              payload: { transferId, segmentIndex: prevSegment, nextOffset: currentBytes }
            }));
          }
        }

        if (currentBytes >= transfer.fileSize) {
          verifyAndCompleteTransfer(transferId);
        }
      }
    } catch (e) {
      console.error("Erreur parsing message P2P", e);
    }
  };

  // ---- Peer management functions (ref-based for stable identity) ----

  const addConnectedPeerFn = (peerId: string) => {
    setConnectedPeers(prev => prev.includes(peerId) ? prev : [...prev, peerId]);
    setConnectionStatus(prev => ({ ...prev, [peerId]: 'connected' }));
  };

  const removeConnectedPeerFn = (peerId: string) => {
    setConnectedPeers(prev => prev.filter(p => p !== peerId));
    setConnectionStatus(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  };

  const cleanupPeerFn = (peerId: string) => {
    if (dataChannels.current[peerId]) {
      try { dataChannels.current[peerId].close(); } catch {}
      delete dataChannels.current[peerId];
    }
    if (peerConnections.current[peerId]) {
      try { peerConnections.current[peerId].close(); } catch {}
      delete peerConnections.current[peerId];
    }
    connectingPeers.current.delete(peerId);
    removeConnectedPeerFn(peerId);
  };

  const setupDataChannelFn = (dc: RTCDataChannel, peerId: string) => {
    dc.binaryType = 'arraybuffer';
    dc.onmessage = (e) => handleReceiveMessageRef.current(e, peerId);
    dc.onopen = () => {
      console.log(`✅ P2P DataChannel ouvert avec ${peerId}`);
      connectingPeers.current.delete(peerId);
      retryCount.current[peerId] = 0;
      
      // Clear timeout on successful open
      if (connectionTimeouts.current[peerId]) {
        clearTimeout(connectionTimeouts.current[peerId]);
        delete connectionTimeouts.current[peerId];
      }
      
      addConnectedPeerFn(peerId);
    };
    dc.onclose = () => {
      console.log(`❌ P2P DataChannel fermé avec ${peerId}`);
      removeConnectedPeerFn(peerId);
    };
    dc.onerror = (err) => {
      console.error(`DataChannel error with ${peerId}:`, err);
    };
    dataChannels.current[peerId] = dc;
  };

  const createPeerConnectionFn = (peerId: string): RTCPeerConnection => {
    if (peerConnections.current[peerId]) {
      try { peerConnections.current[peerId].close(); } catch {}
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { target: peerId, sender: myClientId.current, candidate: event.candidate }
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`ICE state with ${peerId}: ${state}`);
      
      if (state === 'failed' || state === 'disconnected') {
        const currentRetry = retryCount.current[peerId] || 0;
        if (currentRetry < MAX_RETRY) {
          console.log(`🔄 Retrying connection to ${peerId} (attempt ${currentRetry + 1}/${MAX_RETRY})`);
          retryCount.current[peerId] = currentRetry + 1;
          cleanupPeerFn(peerId);
          setTimeout(() => {
            if (myClientId.current) {
              initiateConnectionRef.current(peerId);
            }
          }, RETRY_DELAY * (currentRetry + 1));
        } else {
          console.warn(`❌ All retries exhausted for ${peerId}`);
          setConnectionStatus(prev => ({ ...prev, [peerId]: 'failed' }));
          cleanupPeerFn(peerId);
        }
      }
    };

    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      setupDataChannelFn(receiveChannel, peerId);
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  const initiateConnectionRef = useRef<(peerId: string) => Promise<void>>(async () => {});
  initiateConnectionRef.current = async (peerId: string) => {
    if (!channelRef.current || !myClientId.current) return;
    
    if (connectingPeers.current.has(peerId)) {
      console.log(`Already connecting to ${peerId}, skipping...`);
      return;
    }
    
    const existingDc = dataChannels.current[peerId];
    if (existingDc && existingDc.readyState === 'open') {
      console.log(`Already connected to ${peerId}`);
      addConnectedPeerFn(peerId);
      return;
    }

    connectingPeers.current.add(peerId);
    setConnectionStatus(prev => ({ ...prev, [peerId]: 'connecting' }));
    
    // Clear existing timeout if any
    if (connectionTimeouts.current[peerId]) {
      clearTimeout(connectionTimeouts.current[peerId]);
    }
    
    // Set 12s timeout for connection initiation
    connectionTimeouts.current[peerId] = setTimeout(() => {
      const dc = dataChannels.current[peerId];
      if (!dc || dc.readyState !== 'open') {
        console.warn(`WebRTC connection to ${peerId} timed out after 12s`);
        connectingPeers.current.delete(peerId);
        setConnectionStatus(prev => ({ ...prev, [peerId]: 'failed' }));
        cleanupPeerFn(peerId);
      }
    }, 12000);
    
    try {
      const pc = createPeerConnectionFn(peerId);
      const dc = pc.createDataChannel('officelink-data', { ordered: true });
      setupDataChannelFn(dc, peerId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: { target: peerId, sender: myClientId.current, offer }
      });
    } catch (err) {
      console.error(`Error initiating connection to ${peerId}:`, err);
      connectingPeers.current.delete(peerId);
      setConnectionStatus(prev => ({ ...prev, [peerId]: 'failed' }));
      if (connectionTimeouts.current[peerId]) {
        clearTimeout(connectionTimeouts.current[peerId]);
        delete connectionTimeouts.current[peerId];
      }
    }
  };

  // Heartbeat & presence monitor
  useEffect(() => {
    if (!myId || !myEmail) return;

    const interval = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { clientId: myClientId.current, timestamp: Date.now() }
        });
      }

      const now = Date.now();
      Object.keys(peerConnections.current).forEach(peerId => {
        const lastHb = lastHeartbeatReceived.current[peerId] || now;
        if (now - lastHb > 15000) {
          console.warn(`Timeout de présence détecté pour le pair ${peerId}`);
          setConnectionStatus(prev => ({ ...prev, [peerId]: 'connecting' }));
          
          // Pause transfers with this peer
          Object.keys(activeTransfersRef.current).forEach(transferId => {
            const transfer = activeTransfersRef.current[transferId];
            if (transfer.peerId === peerId && transfer.status === 'transferring') {
              activeTransfersRef.current[transferId] = {
                ...transfer,
                status: 'paused'
              };
            }
          });
          syncTransferList();
          initiateConnectionRef.current(peerId);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [myId, myEmail, syncTransferList]);

  // Unified signaling subscription
  useEffect(() => {
    if (!myId || !myEmail) return;

    const clientId = myClientId.current;
    const channel = supabase.channel('officelink_unified', {
      config: {
        presence: { key: clientId },
      }
    });
    channelRef.current = channel;

    const localIP = getLocalIPMock();
    const os = getOS();
    const deviceName = `${myEmail.split('@')[0]}-${os}`;

    channel
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        if (!payload || payload.target !== clientId) return;
        const senderId = payload.sender;
        
        try {
          if (payload.offer) {
            const pc = createPeerConnectionFn(senderId);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: { target: senderId, sender: clientId, answer }
            });
          } else if (payload.answer) {
            const pc = peerConnections.current[senderId];
            if (pc && pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          } else if (payload.candidate) {
            const pc = peerConnections.current[senderId];
            if (pc) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                console.warn("ICE candidate error (non-fatal):", e);
              }
            }
          }
        } catch (err) {
          console.error(`Signal handling error for ${senderId}:`, err);
        }
      })
      .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
        if (payload && payload.clientId) {
          lastHeartbeatReceived.current[payload.clientId] = Date.now();
          setConnectionStatus(prev => {
            if (prev[payload.clientId] === 'failed') {
              return { ...prev, [payload.clientId]: 'connecting' };
            }
            return prev;
          });
        }
      })
      .on('broadcast', { event: 'fallback-file' }, async ({ payload }) => {
        if (!payload || payload.target !== clientId) return;

        const { transferId, fileName, fileSize, fileType, senderEmail, publicUrl, priority, sender } = payload;
        const newTransfer: FileTransfer = {
          id: transferId,
          fileName,
          fileSize,
          fileType,
          progress: 100,
          speed: fileSize,
          timeRemaining: 0,
          status: 'completed',
          isIncoming: true,
          senderEmail,
          peerId: sender || '',
          priority,
          fileDataUrl: publicUrl,
          startTime: Date.now()
        };

        activeTransfersRef.current[transferId] = newTransfer;
        syncTransferList();

        // Auto download
        const a = document.createElement('a');
        a.href = publicUrl;
        a.download = fileName;
        a.click();

        try {
          await supabase.from('activity_logs').insert({
            user_id: myIdRef.current,
            action: 'RECEPTION_FICHIER_CLOUD',
            description: `Réception Cloud Relais de "${fileName}" (${formatSize(fileSize)}) réussie. Source: ${senderEmail}.`
          });
        } catch {}
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const metadata: { [cid: string]: PeerMeta } = {};
        const allPeerIds: string[] = [];
        
        for (const key in state) {
          const presences = state[key] as any[];
          if (presences && presences[0]) {
            const p = presences[0];
            if (key !== clientId) {
              allPeerIds.push(key);
              metadata[key] = {
                email: p.email || '',
                nom_appareil: p.nom_appareil || 'Appareil inconnu',
                systeme_exploitation: p.systeme_exploitation || 'Inconnu',
                ip_locale: p.ip_locale || '192.168.1.XX'
              };

              // Auto-connect: if we don't have an active connection or connecting state yet
              if (!knownPeers.current.has(key)) {
                knownPeers.current.add(key);
                if (clientId < key) {
                  setTimeout(() => {
                    initiateConnectionRef.current(key);
                  }, Math.random() * 500 + 300);
                }
              }
            }
          }
        }

        setOnlinePeers(allPeerIds);
        setPeerMetadata(prev => ({ ...prev, ...metadata }));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key) {
          knownPeers.current.delete(key);
          setOnlinePeers(prev => prev.filter(p => p !== key));
          cleanupPeerFn(key);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: myId,
            email: myEmail,
            nom_appareil: deviceName,
            systeme_exploitation: os,
            ip_locale: localIP,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      Object.keys(peerConnections.current).forEach(peerId => {
        cleanupPeerFn(peerId);
      });
      // Clear timeouts on cleanup
      Object.values(connectionTimeouts.current).forEach(clearTimeout);
      connectionTimeouts.current = {};
      knownPeers.current.clear();
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, myEmail]);

  // === PUBLIC API ===

  const connectToPeer = useCallback(async (peerId: string) => {
    if (!myClientId.current) return;
    
    const existingDc = dataChannels.current[peerId];
    if (existingDc && existingDc.readyState === 'open') {
      console.log(`Already connected to ${peerId}`);
      return;
    }

    retryCount.current[peerId] = 0;
    await initiateConnectionRef.current(peerId);
  }, []);

  const broadcastMessage = useCallback((text: string) => {
    if (!myIdRef.current || !myEmailRef.current) return;

    const msg: P2PMessage = {
      id: crypto.randomUUID(),
      senderId: myIdRef.current,
      senderEmail: myEmailRef.current,
      text,
      timestamp: new Date().toISOString()
    };

    const payload = { type: 'chat-message', payload: msg };

    const channels: RTCDataChannel[] = Object.values(dataChannels.current);
    channels.forEach(dc => {
      if (dc.readyState === 'open') {
        try { dc.send(JSON.stringify(payload)); } catch (e) {
          console.error("Error broadcasting message:", e);
        }
      }
    });

    setMessages(prev => [...prev, msg]);
  }, []);

  const uploadToCloudFallback = useCallback(async (transferId: string, targetPeerId: string, file: File, priority: 'high' | 'normal' | 'low') => {
    try {
      activeTransfersRef.current[transferId] = {
        ...activeTransfersRef.current[transferId],
        status: 'uploading_to_cloud' as any,
        progress: 0
      };
      syncTransferList();

      const bucket = 'officelink-transfers';
      const filePath = `${transferId}/${file.name}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'fallback-file',
          payload: {
            transferId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            senderEmail: myEmailRef.current,
            target: targetPeerId,
            sender: myClientId.current,
            publicUrl,
            priority
          }
        });
      }

      activeTransfersRef.current[transferId] = {
        ...activeTransfersRef.current[transferId],
        status: 'completed',
        progress: 100,
        fileDataUrl: publicUrl
      };
      syncTransferList();

      const duration = ((Date.now() - (activeTransfersRef.current[transferId].startTime || Date.now())) / 1000).toFixed(1);
      const myIP = getLocalIPMock();
      try {
        await supabase.from('activity_logs').insert({
          user_id: myIdRef.current,
          action: 'ENVOI_FICHIER_CLOUD',
          description: `Envoi Cloud Relais de "${file.name}" (${formatSize(file.size)}) réussi. Source IP: ${myIP}, Durée: ${duration}s.`
        });
      } catch {}

      processQueue();
    } catch (err: any) {
      console.error("Cloud upload fallback error:", err);
      activeTransfersRef.current[transferId] = {
        ...activeTransfersRef.current[transferId],
        status: 'failed'
      };
      syncTransferList();
      alert(`Échec du transfert Cloud Relais: ${err.message || err}`);
      processQueue();
    }
  }, [syncTransferList, processQueue]);

  const isPeerConnected = useCallback((peerId: string): boolean => {
    const dc = dataChannels.current[peerId];
    return !!dc && dc.readyState === 'open';
  }, []);

  const sendFile = useCallback((targetPeerId: string, file: File, priority: 'high' | 'normal' | 'low' = 'normal') => {
    if (!myIdRef.current || !myEmailRef.current) return;

    const transferId = crypto.randomUUID();
    const newTransfer: FileTransfer = {
      id: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      progress: 0, speed: 0, timeRemaining: 0,
      status: 'calculating_sha256', // Start with hash calculation
      isIncoming: false,
      senderEmail: myEmailRef.current,
      peerId: targetPeerId,
      priority,
      startTime: Date.now()
    };

    activeTransfersRef.current[transferId] = newTransfer;
    filesToSend.current[transferId] = file;
    syncTransferList();

    const isConnected = isPeerConnected(targetPeerId);

    if (!isConnected) {
      console.log("P2P non disponible, basculement en mode Cloud Relais.");
      uploadToCloudFallback(transferId, targetPeerId, file, priority);
      return;
    }

    const dc = dataChannels.current[targetPeerId];
    if (!dc || dc.readyState !== 'open') {
      console.log("Canal de données P2P fermé, basculement en mode Cloud Relais.");
      uploadToCloudFallback(transferId, targetPeerId, file, priority);
      return;
    }

    // Async hash calculation before requesting accept (P2P mode)
    calculateSHA256(file).then(sha256 => {
      const updated = {
        ...activeTransfersRef.current[transferId],
        status: 'pending_accept' as const,
        sha256
      };
      activeTransfersRef.current[transferId] = updated;
      syncTransferList();

      try {
        dc.send(JSON.stringify({
          type: 'file-metadata',
          payload: {
            transferId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            senderEmail: myEmailRef.current,
            priority,
            sha256
          }
        }));
      } catch (e) {
        console.error("Error sending file metadata:", e);
        // Fallback to cloud if P2P signaling failed
        uploadToCloudFallback(transferId, targetPeerId, file, priority);
      }
    }).catch(err => {
      console.error("Error calculating hash:", err);
      activeTransfersRef.current[transferId] = { ...newTransfer, status: 'failed' };
      syncTransferList();
      processQueue();
    });

  }, [syncTransferList, processQueue, isPeerConnected, uploadToCloudFallback]);

  const acceptTransfer = useCallback((transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (transfer) {
      activeTransfersRef.current[transferId] = {
        ...transfer, 
        status: 'transferring', 
        offset: 0, 
        lastUpdate: Date.now(),
        startTime: Date.now(),
        lastAckedSegment: -1
      };
      syncTransferList();

      const dc = dataChannels.current[transfer.peerId];
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'file-accept', payload: { transferId } }));
      }
    }
  }, [syncTransferList]);

  const rejectTransfer = useCallback((transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (transfer) {
      activeTransfersRef.current[transferId] = { ...transfer, status: 'rejected' };
      syncTransferList();

      const dc = dataChannels.current[transfer.peerId];
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'file-reject', payload: { transferId } }));
      }
      processQueue();
    }
  }, [syncTransferList, processQueue]);

  const pauseTransfer = useCallback((transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (transfer) {
      activeTransfersRef.current[transferId] = { ...transfer, status: 'paused' };
      syncTransferList();

      const dc = dataChannels.current[transfer.peerId];
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'file-pause', payload: { transferId } }));
      }
    }
  }, [syncTransferList]);

  const resumeTransfer = useCallback((transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (transfer) {
      const resumeOffset = transfer.offset || 0;
      activeTransfersRef.current[transferId] = { ...transfer, status: 'transferring', lastUpdate: Date.now() };
      syncTransferList();

      const dc = dataChannels.current[transfer.peerId];
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'file-resume', payload: { transferId, offset: resumeOffset } }));
        if (!transfer.isIncoming) {
          sendNextChunkRef.current(transferId);
        }
      }
    }
  }, [syncTransferList]);

  const cancelTransfer = useCallback((transferId: string) => {
    const transfer = activeTransfersRef.current[transferId];
    if (transfer) {
      activeTransfersRef.current[transferId] = { ...transfer, status: 'cancelled' };
      syncTransferList();

      const dc = dataChannels.current[transfer.peerId];
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'file-cancel', payload: { transferId } }));
      }

      if (transfer.isIncoming) {
        delete receivedChunks.current[transferId];
      } else {
        delete filesToSend.current[transferId];
      }
      processQueue();
    }
  }, [syncTransferList, processQueue]);

  return (
    <WebRTCContext.Provider value={{
      messages,
      peers: connectedPeers,
      onlinePeers,
      peerMetadata,
      activeTransfers,
      connectionStatus,
      broadcastMessage,
      sendFile,
      acceptTransfer,
      rejectTransfer,
      pauseTransfer,
      resumeTransfer,
      cancelTransfer,
      connectToPeer,
      isPeerConnected,
      downloadDirectoryHandle,
      selectDownloadDirectory
    }}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTC(): WebRTCContextType {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
}
