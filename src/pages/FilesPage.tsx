import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWebRTC, formatSize } from '../features/officelink/hooks/useWebRTC';
import { 
  UploadCloud, File, Download, Search, HardDrive, Play, Pause, XCircle, 
  CheckCircle2, Laptop, User, ShieldAlert, Check, X, ArrowRight, ArrowLeftRight, Loader2
} from 'lucide-react';

export default function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeerIds, setSelectedPeerIds] = useState<string[]>(searchParams.get('peerId') ? [searchParams.get('peerId') as string] : []);
  const [searchQuery, setSearchQuery] = useState('');
  const [transferPriority, setTransferPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedPeerIds with query param if it changes
  useEffect(() => {
    const pId = searchParams.get('peerId');
    if (pId && !selectedPeerIds.includes(pId)) {
      setSelectedPeerIds(prev => [...prev, pId]);
    }
  }, [searchParams]);

  useEffect(() => {
    // Prevent browser from opening dropped files globally
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const { 
    peers, 
    onlinePeers,
    peerMetadata, 
    activeTransfers, 
    connectionStatus,
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
  } = useWebRTC();

  // Trigger connection when peers are selected
  useEffect(() => {
    selectedPeerIds.forEach(peerId => {
      connectToPeer(peerId);
    });
  }, [selectedPeerIds, connectToPeer]);

  const processFile = (file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      alert("Le fichier est trop volumineux. La limite professionnelle est de 200 Mo.");
      return;
    }
    
    selectedPeerIds.forEach(peerId => {
      sendFile(peerId, file, transferPriority);
    });
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (selectedPeerIds.length === 0) {
      alert("Veuillez d'abord sélectionner au moins un appareil destinataire dans la liste.");
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedPeerIds.length === 0) {
      alert("Veuillez d'abord sélectionner au moins un appareil destinataire dans la liste.");
      return;
    }
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  const getSpeedFormatted = (bytesPerSec: number) => {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTimeRemainingFormatted = (seconds: number) => {
    if (seconds === 0) return 'Terminé';
    if (seconds < 60) return `${seconds}s restantes`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s restantes`;
  };


  // Separate active transfers from completed/cancelled ones
  const runningTransfers = activeTransfers.filter(t => 
    t.status === 'transferring' || 
    t.status === 'paused' || 
    t.status === 'pending_accept'
  );

  const completedTransfers = activeTransfers.filter(t => 
    t.status === 'completed' || 
    t.status === 'rejected' || 
    t.status === 'cancelled' ||
    t.status === 'failed'
  );

  const pendingIncoming = activeTransfers.filter(t => 
    t.status === 'pending_accept' && t.isIncoming
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] bg-slate-50 overflow-hidden">
      
      {/* 1. Peers Selection List (Left Column) */}
      <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            1. Choisir le destinataire
          </h3>
          
          <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {onlinePeers.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Laptop className="w-10 h-10 mx-auto mb-2 text-slate-300 animate-pulse" />
                <p className="text-xs text-slate-400 px-4">Aucun autre appareil détecté sur le réseau local.</p>
              </div>
            ) : (
              onlinePeers.map(peerId => {
                const meta = peerMetadata[peerId];
                const isSelected = selectedPeerIds.includes(peerId);
                const isConnected = isPeerConnected(peerId);
                const status = connectionStatus[peerId];
                
                return (
                  <button
                    key={peerId}
                    onClick={() => {
                      setSelectedPeerIds(prev => 
                        prev.includes(peerId) 
                          ? prev.filter(id => id !== peerId) 
                          : [...prev, peerId]
                      );
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 hover:bg-slate-50 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {meta?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">
                            {meta?.nom_appareil || 'Inconnu'}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {meta?.ip_locale || '192.168.1.XX'}
                          </p>
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-semibold text-slate-500 mt-1">
                            {meta?.systeme_exploitation || 'OS'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {isConnected ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            Connecté
                          </span>
                        ) : status === 'connecting' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 animate-pulse">
                            Connexion...
                          </span>
                        ) : status === 'failed' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            Échec
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            En ligne
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selectedPeerIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 bg-blue-50/30 p-3 rounded-xl border border-blue-100/50">
            <p className="text-xs text-slate-500">Destinataires sélectionnés :</p>
            <p className="font-bold text-blue-800 text-sm mt-0.5">
              {selectedPeerIds.length} appareil(s)
            </p>
          </div>
        )}

        {/* Directory Selection Button */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2 font-semibold">Réception en arrière-plan :</p>
          <button
            onClick={selectDownloadDirectory}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all border ${
              downloadDirectoryHandle 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            {downloadDirectoryHandle ? "Dossier local lié ✓" : "Choisir le dossier de réception"}
          </button>
          <p className="text-[9px] text-slate-400 mt-1.5 text-center px-1">
            {downloadDirectoryHandle 
              ? `Les fichiers seront enregistrés directement dans le dossier sélectionné.`
              : `Pour recevoir sans pop-up, liez un dossier local.`}
          </p>
        </div>
      </div>

      {/* 2. Drag & Drop File upload (Center / Right Column) */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
          
          {/* Transfer Setup / Active Transfers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col overflow-hidden shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              2. Envoyer et Gérer les Transferts
            </h3>
            
            {/* Priority Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Priorité du transfert
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'normal', 'low'] as const).map((prio) => {
                  const labelMap = { high: 'Haute (Prioritaire)', normal: 'Normale', low: 'Basse (Arrière-plan)' };
                  const colorMap = {
                    high: 'border-red-205 text-red-700 hover:bg-red-50 bg-red-50/20',
                    normal: 'border-blue-205 text-blue-700 hover:bg-blue-50 bg-blue-50/20',
                    low: 'border-slate-205 text-slate-750 hover:bg-slate-50 bg-slate-50/20'
                  };
                  const activeMap = {
                    high: 'ring-2 ring-red-500 border-red-500 bg-red-50 text-red-950 font-bold',
                    normal: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 text-blue-950 font-bold',
                    low: 'ring-2 ring-slate-500 border-slate-500 bg-slate-200 text-slate-950 font-bold'
                  };
                  const isSelected = transferPriority === prio;

                  return (
                    <button
                      key={prio}
                      type="button"
                      disabled={selectedPeerIds.length === 0}
                      onClick={() => setTransferPriority(prio)}
                      className={`py-2 px-3 border rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected ? activeMap[prio] : colorMap[prio]
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        prio === 'high' ? 'bg-red-500' : prio === 'normal' ? 'bg-blue-500' : 'bg-slate-500'
                      }`}></span>
                      {labelMap[prio]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Zone */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => { e.preventDefault(); if (selectedPeerIds.length > 0) setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { setIsDragging(false); handleFileDrop(e); }}
              onClick={() => selectedPeerIds.length > 0 && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 flex flex-col items-center justify-center ${
                selectedPeerIds.length === 0 
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed' 
                  : isDragging
                  ? 'border-blue-500 bg-blue-100/50 scale-[1.02] shadow-lg shadow-blue-500/10 cursor-pointer'
                  : 'border-blue-300 bg-blue-50/10 hover:bg-blue-50/20 cursor-pointer'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                disabled={selectedPeerIds.length === 0}
                accept=".mp4,.avi,.mov,.wmv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,image/*,audio/*"
              />
              <UploadCloud className={`w-12 h-12 mb-4 transition-transform duration-300 ${
                selectedPeerIds.length > 0 ? (isDragging ? 'text-blue-600 scale-110' : 'text-blue-500') : 'text-slate-400'
              }`} />
              <h4 className="font-bold text-slate-700 mb-1 text-sm">
                {selectedPeerIds.length > 0 ? (isDragging ? "Déposez le fichier maintenant !" : "Glissez un fichier ici") : "Sélectionnez d'abord un appareil"}
              </h4>
              <p className="text-xs text-slate-400">
                {selectedPeerIds.length > 0 ? "ou cliquez pour parcourir votre appareil" : "Choisissez au moins un destinataire à gauche pour déverrouiller l'envoi"}
              </p>
            </div>

            {/* Active Transfers progress */}
            <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Transferts Actifs</h4>
              {runningTransfers.length === 0 ? (
                <p className="text-slate-400 text-xs py-6 text-center border border-dashed border-slate-100 rounded-xl bg-slate-50/30">Aucun transfert actif.</p>
              ) : (
                runningTransfers.map(transfer => {
                  const peerMeta = peerMetadata[transfer.peerId];
                  const displayName = peerMeta?.nom_appareil || transfer.senderEmail;
                  
                  return (
                    <div key={transfer.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/40">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{transfer.fileName}</p>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            {transfer.isIncoming ? <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" /> : <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />}
                            <span>{transfer.isIncoming ? `Reçu de : ${displayName}` : `Envoyé à : ${displayName}`}</span>
                          </p>
                          
                          {/* Badges for priority, segment size, and signature */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {transfer.priority && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                transfer.priority === 'high' 
                                  ? 'bg-red-50 border border-red-150 text-red-650' 
                                  : transfer.priority === 'low'
                                  ? 'bg-slate-100 border border-slate-200 text-slate-600'
                                  : 'bg-blue-50 border border-blue-150 text-blue-650'
                              }`}>
                                Prio: {transfer.priority === 'high' ? 'Haute' : transfer.priority === 'low' ? 'Basse' : 'Normale'}
                              </span>
                            )}
                            {transfer.status === 'transferring' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 border border-teal-150 text-teal-650">
                                Segment: {transfer.speed > 5 * 1024 * 1024 ? '4 Mo' : transfer.speed < 500 * 1024 ? '1 Mo' : '2 Mo'}
                              </span>
                            )}
                            {transfer.sha256 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 border border-slate-250 text-slate-500 font-mono" title={transfer.sha256}>
                                SHA-256: {transfer.sha256.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {transfer.status === 'transferring' && (
                            <button 
                              onClick={() => pauseTransfer(transfer.id)}
                              className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                              title="Mettre en pause"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {transfer.status === 'paused' && (
                            <button 
                              onClick={() => resumeTransfer(transfer.id)}
                              className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                              title="Reprendre"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => cancelTransfer(transfer.id)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {transfer.status === 'uploading_to_cloud' as any ? (
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100 p-2 rounded-lg">
                          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-blue-600" />
                          <span>Relais Cloud Sécurisé en cours d'envoi...</span>
                        </div>
                      ) : transfer.status === 'calculating_sha256' ? (
                        <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 p-2 rounded-lg">
                          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                          <span>Signature SHA-256 en cours de calcul...</span>
                        </div>
                      ) : transfer.status === 'verifying_sha256' ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-650 font-semibold bg-indigo-50 border border-indigo-100 p-2 rounded-lg">
                          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-650" />
                          <span>Validation de la signature SHA-256 en cours...</span>
                        </div>
                      ) : transfer.status === 'pending_accept' ? (
                        <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 p-2 rounded-lg">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>En attente d'acceptation par le destinataire...</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {/* Progress bar */}
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${transfer.status === 'paused' ? 'bg-amber-500' : 'bg-blue-600'}`}
                              style={{ width: `${transfer.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 font-semibold">
                            <span>{transfer.progress}%</span>
                            <span>{formatSize(transfer.progress * transfer.fileSize / 100)} / {formatSize(transfer.fileSize)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Vitesse : {getSpeedFormatted(transfer.speed)}</span>
                            <span>{getTimeRemainingFormatted(transfer.timeRemaining)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* History of Completed Transfers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                Historique Réseau Local
              </h3>
              <div className="relative w-36">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {completedTransfers.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                  <File className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Aucun fichier transféré dans l'historique.</p>
                </div>
              ) : (
                completedTransfers
                  .filter(t => t.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(transfer => {
                    const peerMeta = peerMetadata[transfer.peerId];
                    const isSuccess = transfer.status === 'completed';
                    
                    return (
                      <div key={transfer.id} className="p-3.5 border border-slate-100 rounded-xl flex items-center gap-3.5 bg-slate-50 hover:bg-slate-100/30 transition-colors text-xs">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSuccess ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'
                        }`}>
                          <File className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate" title={transfer.fileName}>{transfer.fileName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span>{formatSize(transfer.fileSize)}</span>
                            <span>•</span>
                            <span className="truncate">
                              {transfer.isIncoming ? `De : ${peerMeta?.nom_appareil || transfer.senderEmail}` : `À : ${peerMeta?.nom_appareil || transfer.senderEmail}`}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            transfer.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : transfer.status === 'rejected'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {transfer.status === 'completed' && 'Succès'}
                            {transfer.status === 'rejected' && 'Refusé'}
                            {transfer.status === 'cancelled' && 'Annulé'}
                            {transfer.status === 'failed' && 'Échec'}
                          </span>
                          
                          {transfer.status === 'completed' && transfer.isIncoming && transfer.fileDataUrl && (
                            <a 
                              href={transfer.fileDataUrl} 
                              download={transfer.fileName}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Télécharger à nouveau"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
