import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC, P2PMessage } from '../features/officelink/hooks/useWebRTC';
import { getSession } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Send, Lock, Wifi, MessageSquare as MessageSquareIcon, Smile } from 'lucide-react';

export default function ChatPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession().then(setSession);
  }, []);

  const { 
    messages, 
    peers, 
    broadcastMessage, 
    typingPeers, 
    setMyTypingStatus, 
    markMessagesAsRead 
  } = useWebRTC();

  const myEmail = session?.user?.email || '';

  // Mark messages as read when active
  useEffect(() => {
    if (!myEmail) return;
    const unreadSenders = new Set(
      messages
        .filter(m => m.senderEmail !== myEmail && m.status !== 'read')
        .map(m => m.senderEmail)
    );
    unreadSenders.forEach(sender => {
      markMessagesAsRead(sender);
    });
  }, [messages, myEmail, markMessagesAsRead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      setMyTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setMyTypingStatus(false);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    broadcastMessage(inputText);
    setInputText('');
    
    setIsTyping(false);
    setMyTypingStatus(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500 text-white',
      'bg-emerald-500 text-white',
      'bg-violet-500 text-white',
      'bg-amber-500 text-white',
      'bg-rose-500 text-white',
      'bg-cyan-500 text-white',
      'bg-indigo-500 text-white',
      'bg-orange-500 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
    '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
    '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '❤️', '🔥',
    '💡', '✅', '❌', '⚠️', '🎉', '💻', '📁', '👀', '🌟', '⭐'
  ];

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const renderTicks = (msg: P2PMessage) => {
    if (msg.status === 'read') {
      return <span className="text-sky-300 font-bold ml-1" title="Lu">✓✓</span>;
    }
    if (msg.status === 'delivered') {
      return <span className="text-slate-300 font-bold ml-1" title="Distribué">✓✓</span>;
    }
    return <span className="text-slate-400 font-bold ml-1" title="Envoyé">✓</span>;
  };

  const activeTypingPeers = Object.keys(typingPeers).filter(email => email !== myEmail && typingPeers[email]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            Chat Local Sécurisé (P2P)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Chiffré de bout en bout • Historique local et confidentiel
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
          <Wifi className="w-4 h-4" />
          {peers.length} pair(s) connecté(s)
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <MessageSquareIcon className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">Le salon de discussion LAN est vide.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderEmail === myEmail;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* User Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${getAvatarColor(msg.senderEmail)}`}>
                  {msg.senderEmail.charAt(0).toUpperCase()}
                </div>
                
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-slate-655">
                      {isMe ? 'Moi' : msg.senderEmail.split('@')[0]}
                    </span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl relative shadow-sm border ${
                    isMe 
                      ? 'bg-blue-600 border-blue-700 text-white rounded-tr-none' 
                      : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[9px] font-medium ${
                      isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && renderTicks(msg)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing status bar */}
      {activeTypingPeers.length > 0 && (
        <div className="text-xs text-emerald-600 font-semibold px-6 py-2 bg-slate-50 border-t border-b border-slate-200 flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>
            {activeTypingPeers.map(email => email.split('@')[0]).join(', ')} {activeTypingPeers.length === 1 ? 'est en train d\'écrire...' : 'sont en train d\'écrire...'}
          </span>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0 relative overflow-visible">
        {/* Emoji picker toggle */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl border transition-all ${
              showEmojiPicker 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
            title="Ajouter un émoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-0 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-72 h-64 overflow-y-auto grid grid-cols-6 gap-2.5 z-55 animate-in fade-in slide-in-from-bottom-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Envoyer un message chiffré sur le réseau local..."
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
