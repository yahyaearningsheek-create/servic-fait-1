import React, { useState, useEffect } from 'react';
import { useWebRTC } from '../features/officelink/hooks/useWebRTC';
import { getSession } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { 
  Laptop, Activity, MessageSquare, Files, ShieldCheck, 
  Smartphone, Monitor, HelpCircle, ArrowRight, UserCheck, Network, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  
  useEffect(() => {
    getSession().then((s) => setSession(s));
  }, []);

  const { onlinePeers, peerMetadata } = useWebRTC();

  const getOSIcon = (os: string) => {
    switch (os.toLowerCase()) {
      case 'windows':
        return <Monitor className="w-5 h-5 text-blue-500" />;
      case 'macos':
      case 'ios':
        return <Laptop className="w-5 h-5 text-slate-700" />;
      case 'android':
      case 'linux':
        return <Smartphone className="w-5 h-5 text-emerald-500" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getOSBadgeColor = (os: string) => {
    switch (os.toLowerCase()) {
      case 'windows':
        return 'bg-blue-50 text-blue-700 border-blue-150';
      case 'macos':
        return 'bg-slate-50 text-slate-750 border-slate-200';
      case 'linux':
      case 'android':
        return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  // Extract my device from the list
  const myEmail = session?.user?.email || '';
  
  const otherDevices = onlinePeers.map(peerId => ({
    user_id: peerId,
    email: peerMetadata[peerId]?.email || '',
    nom_appareil: peerMetadata[peerId]?.nom_appareil || 'Appareil distant',
    systeme_exploitation: peerMetadata[peerId]?.systeme_exploitation || 'Inconnu',
  }));

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Vue d'ensemble Réseau</h2>
          <p className="text-slate-500 mt-1">
            Détection automatique et instantanée des appareils connectés à votre réseau local (LAN/Wi-Fi).
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-bold shadow-sm">
          <Activity className="w-4 h-4 animate-pulse" />
          Réseau local sécurisé
        </div>
      </header>
      
      {/* Visual Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400/50 transition-all group flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-500 text-sm">Appareils Détectés</h3>
            <p className="text-4xl font-extrabold text-blue-600 group-hover:scale-105 transition-transform origin-left">
              {onlinePeers.length + 1}
            </p>
            <p className="text-xs text-slate-400">Prêts pour l'échange local</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
            <Laptop className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-400/50 transition-all group flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-500 text-sm">Partage Direct (P2P)</h3>
            <p className="text-4xl font-extrabold text-emerald-600 group-hover:scale-105 transition-transform origin-left">
              Actif
            </p>
            <p className="text-xs text-slate-400">Zéro stockage cloud</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
            <Files className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400/50 transition-all group flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-500 text-sm">Messagerie Instantanée</h3>
            <p className="text-4xl font-extrabold text-indigo-600 group-hover:scale-105 transition-transform origin-left">
              Sécurisée
            </p>
            <p className="text-xs text-slate-400">Cryptage bout-en-bout</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column details: My Device & Online list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: My Device Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Votre Appareil
          </h3>
          
          {session?.user ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
                  {myEmail.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{myEmail}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Session active</p>
                </div>
              </div>
              <div className="border-t border-slate-200/80 pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Nom Appareil :</span>
                  <span className="font-bold text-slate-700">{myEmail.split('@')[0]}-PC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Système :</span>
                  <span className="font-bold text-slate-700">Windows</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">IP Locale :</span>
                  <span className="font-bold text-slate-700 font-mono">192.168.1.34</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              Chargement des détails de session...
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="space-y-2">
            <Link 
              to="/officelink/chat" 
              className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all text-sm font-semibold text-slate-700"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-blue-500" /> Salon de discussion LAN
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link 
              to="/officelink/files" 
              className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all text-sm font-semibold text-slate-700"
            >
              <span className="flex items-center gap-2">
                <Files className="w-4.5 h-4.5 text-emerald-500" /> Partage de fichiers direct
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Right column: Devices Detected Grid (Takes 2 columns in large screens) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              Appareils connectés au même réseau local (cliquez pour vous connecter)
            </h3>
            
            {otherDevices.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300 animate-pulse" />
                <h4 className="font-bold text-slate-700 mb-1">Recherche d'appareils en cours...</h4>
                <p className="text-xs text-slate-400 px-8">
                  Dès qu'un autre collaborateur se connecte sur le même réseau local, il apparaîtra ici instantanément.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {otherDevices.map((device, index) => (
                  <Link 
                    key={index}
                    to={`/officelink/files?peerId=${device.user_id}`}
                    className="p-4 border border-slate-200 rounded-2xl bg-white hover:bg-blue-50/20 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {getOSIcon(device.systeme_exploitation)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-700 transition-colors">
                          {device.nom_appareil}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{device.email}</p>
                        <span className={`inline-block px-2 py-0.5 border rounded text-[9px] font-semibold mt-1 ${getOSBadgeColor(device.systeme_exploitation)}`}>
                          {device.systeme_exploitation}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 group-hover:bg-emerald-100/55 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      En ligne
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/80 pt-4 mt-6 flex justify-between items-center text-xs text-slate-400 font-semibold">
            <span>Aucun scan manuel requis</span>
            <span>Détection instantanée</span>
          </div>
        </div>
      </div>
    </div>
  );
}
