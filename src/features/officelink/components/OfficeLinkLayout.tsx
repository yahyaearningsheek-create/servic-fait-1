import React, { useState, useEffect, ErrorInfo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Network, MessageSquare, Files, Activity, Menu, X, Power, 
  AlertTriangle, CheckCircle2, Loader2, Settings, ShieldAlert, Check, RefreshCw
} from 'lucide-react';
import { supabase, getSession } from '../../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { WebRTCProvider, useWebRTC, formatSize, getOS, getLocalIPMock } from '../hooks/useWebRTC';

// ===== ERROR BOUNDARY =====
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class OfficeLinkErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OfficeLink] Erreur de rendu capturée:', error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
          <div className="max-w-md w-full p-8 rounded-2xl shadow-2xl border border-red-500/20 bg-slate-800/80 backdrop-blur-lg text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Erreur de l'application</h2>
            <p className="text-sm text-slate-400">Une erreur inattendue s'est produite dans OfficeLink.</p>
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/20 text-red-300 text-xs font-mono text-left overflow-auto max-h-32">
              {/* @ts-ignore */}
              {this.state.error?.message || 'Erreur inconnue'}
            </div>
            <button
              onClick={() => {
                // @ts-ignore
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}


function getDeviceId(): string {
  let id = localStorage.getItem('officelink_device_id');
  if (!id) {
    id = `device-${crypto.randomUUID()}`;
    localStorage.setItem('officelink_device_id', id);
  }
  return id;
}

export default function OfficeLinkLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Security block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [checkingBlock, setCheckingBlock] = useState(true);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      if (!s) {
        setAuthLoading(false);
        setCheckingBlock(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setAuthLoading(false);
        setCheckingBlock(false);
        setIsBlocked(false);
        setBlockedReason('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    // Safety timeout: never stay stuck on loading for more than 8 seconds
    const safetyTimer = setTimeout(() => {
      console.warn('[OfficeLink] Safety timeout triggered — forcing loading complete');
      setCheckingBlock(false);
      setAuthLoading(false);
    }, 8000);

    const checkBlockAndUpsertDevice = async () => {
      try {
        setCheckingBlock(true);
        const deviceId = getDeviceId();
        const userId = session.user.id;
        const userEmail = session.user.email;

        // 1. Check if user is blocked (graceful: skip if table doesn't exist)
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

          if (userData && userData.role === 'Bloqué') {
            setIsBlocked(true);
            setBlockedReason("Votre compte utilisateur a été bloqué par un administrateur.");
            setCheckingBlock(false);
            setAuthLoading(false);
            clearTimeout(safetyTimer);
            return;
          }
        } catch (userCheckErr) {
          console.warn('[OfficeLink] Vérification utilisateur ignorée (table absente ou erreur):', userCheckErr);
        }

        // 2. Check if device is blocked (graceful: skip if table doesn't exist)
        try {
          const { data: deviceData } = await supabase
            .from('devices')
            .select('statut')
            .eq('id', deviceId)
            .single();

          if (deviceData && deviceData.statut === 'blocked') {
            setIsBlocked(true);
            setBlockedReason("Ce terminal a été bloqué par un administrateur.");
            setCheckingBlock(false);
            setAuthLoading(false);
            clearTimeout(safetyTimer);
            return;
          }
        } catch (deviceCheckErr) {
          console.warn('[OfficeLink] Vérification appareil ignorée (table absente ou erreur):', deviceCheckErr);
        }

        // 3. Upsert device details (graceful: skip on error)
        try {
          const os = getOS();
          const ip = getLocalIPMock();
          
          await supabase.from('devices').upsert({
            id: deviceId,
            user_id: userId,
            nom_appareil: `${userEmail?.split('@')[0] || 'User'}-${os}`,
            type_appareil: 'PC',
            systeme_exploitation: os,
            adresse_ip: ip,
            statut: 'online',
            last_seen: new Date().toISOString()
          });
        } catch (upsertErr) {
          console.warn('[OfficeLink] Upsert appareil ignoré:', upsertErr);
        }

      } catch (err) {
        console.error("Erreur de vérification de sécurité:", err);
      } finally {
        clearTimeout(safetyTimer);
        setCheckingBlock(false);
        setAuthLoading(false);
      }
    };

    checkBlockAndUpsertDevice();

    return () => clearTimeout(safetyTimer);
  }, [session]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError('');
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setIsLoginMode(true);
        setAuthError('');
      }
    } catch (err: any) {
      setAuthError(err.message || "Erreur d'authentification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading || (session && checkingBlock)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-slate-400 text-xs font-semibold">Vérification de sécurité en cours...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-md w-full p-8 rounded-2xl shadow-2xl border border-slate-700 bg-slate-800/80 backdrop-blur-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400 mb-2">
              OfficeLink
            </h1>
            <p className="text-sm text-slate-400">Intranet Collaboratif Sécurisé</p>
            <p className="mt-3 text-xs text-slate-500">
              Connectez-vous pour accéder au Dashboard, à la messagerie et aux outils IT.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Email Professionnel</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-slate-700 border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                placeholder="prenom.nom@entreprise.dj"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Mot de passe</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-slate-700 border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoginMode ? 'Se Connecter' : 'Créer un compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-sm font-medium hover:underline text-blue-400"
            >
              {isLoginMode ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700 text-center">
            <a href="/" className="text-sm text-orange-400 hover:text-orange-300 hover:underline flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Retourner au Signalement d'Urgence IT
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl shadow-2xl border border-red-500/20 bg-slate-900/90 backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl"></div>

          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-red-500">Accès Réseau Bloqué</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Mode Entreprise</p>
          </div>

          <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/30 text-red-200 text-sm font-medium leading-relaxed">
            {blockedReason}
          </div>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur système de votre entreprise.
          </p>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-355 font-bold rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 text-sm shadow-inner"
            >
              <Power className="w-4 h-4 text-red-400" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OfficeLinkErrorBoundary>
      <WebRTCProvider session={session}>
        <OfficeLinkLayoutContent session={session} />
      </WebRTCProvider>
    </OfficeLinkErrorBoundary>
  );
}

function OfficeLinkLayoutContent({ session }: { session: Session }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const { activeTransfers, peerMetadata, acceptTransfer, rejectTransfer } = useWebRTC();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navLinks = [
    { name: 'Dashboard', path: '/officelink', icon: Activity },
    { name: 'Chat (P2P)', path: '/officelink/chat', icon: MessageSquare },
    { name: 'Fichiers LAN', path: '/officelink/files', icon: Files },
    { name: 'Administration', path: '/officelink/admin', icon: Settings },
  ];

  // Global pending incoming file transfer alerts
  const pendingIncoming = activeTransfers.filter(t => 
    t.status === 'pending_accept' && t.isIncoming
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex relative">
      {/* Global floating toast notification for file transfer invitations */}
      {pendingIncoming.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[calc(100%-2rem)] bg-white border border-amber-200 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 border border-amber-200 shrink-0">
              <ShieldAlert className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-800 text-sm">Demande de fichier entrant</h4>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                De : <span className="font-semibold text-slate-700">{peerMetadata[pendingIncoming[0].peerId]?.nom_appareil || pendingIncoming[0].senderEmail}</span>
              </p>
              <p className="text-xs text-blue-600 font-medium mt-1 truncate">
                "{pendingIncoming[0].fileName}" ({formatSize(pendingIncoming[0].fileSize)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={() => rejectTransfer(pendingIncoming[0].id)}
              className="px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Refuser
            </button>
            <button
              onClick={() => acceptTransfer(pendingIncoming[0].id)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <Check className="w-3.5 h-3.5" /> Accepter
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            OfficeLink
          </h1>
          <p className="text-xs text-slate-400 mt-1">Intranet Collaboratif Sécurisé</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.path === '/officelink' 
              ? location.pathname === '/officelink' 
              : location.pathname.startsWith(link.path);
              
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}
          
          <div className="pt-8">
             <Link
                to="/"
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 border border-orange-500/20"
              >
                <AlertTriangle size={18} />
                <span className="font-medium">Signalement IT</span>
              </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap text-slate-300">
              {session?.user?.email}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <Power size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 shrink-0">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-500">OfficeLink</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-xl z-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="p-4 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = link.path === '/officelink' ? location.pathname === '/officelink' : location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <Icon size={18} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
