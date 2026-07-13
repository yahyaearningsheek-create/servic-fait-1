import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Laptop, Activity, ShieldAlert, CheckCircle, XCircle, Search, RefreshCw, BarChart2, Shield, UserX, AlertCircle } from 'lucide-react';
import { useWebRTC } from '../features/officelink/hooks/useWebRTC';

interface DBUser {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string;
  role: string;
  departement: string | null;
  fonction: string | null;
  statut: string;
}

interface DBDevice {
  id: string;
  nom_appareil: string;
  type_appareil: string;
  systeme_exploitation: string;
  adresse_ip: string;
  statut: string;
  last_seen: string;
  user_email?: string;
}

interface DBLog {
  id: string;
  action: string;
  description: string;
  date: string;
  user_email?: string;
}

export default function AdminPage() {
  const { showToast } = useWebRTC();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'devices' | 'logs'>('stats');
  const [users, setUsers] = useState<DBUser[]>([]);
  const [devices, setDevices] = useState<DBDevice[]>([]);
  const [logs, setLogs] = useState<DBLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Admin authorization & self-block protection state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'user' | 'device';
    id: string;
    label: string;
    currentValue: string;
  }>({
    isOpen: false,
    type: 'user',
    id: '',
    label: '',
    currentValue: ''
  });

  const checkAdminRole = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        showToast("Vous devez être connecté pour accéder à cette page.", "error");
        return false;
      }
      setCurrentUserId(user.id);

      const { data: userData, error } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', user.id)
        .maybeSingle();

      const email = user.email || '';
      const hasAdminEmail = email.toLowerCase().includes('admin') || email.toLowerCase() === 'ysaid13@gmail.com';

      if (userData && (userData.role === 'Super Administrateur' || hasAdminEmail)) {
        setIsAdmin(true);
        return true;
      } else if (!userData && hasAdminEmail) {
        setIsAdmin(true);
        return true;
      } else {
        setIsAdmin(false);
        showToast("Accès refusé. Vous n'avez pas les droits d'administration.", "error");
        return false;
      }
    } catch (err) {
      console.error("Erreur de vérification du rôle admin:", err);
      setIsAdmin(false);
      showToast("Erreur lors de la vérification de vos droits d'accès.", "error");
      return false;
    }
  };

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Users
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');
      if (usersErr) throw usersErr;

      // 2. Fetch Devices
      const { data: devicesData, error: devicesErr } = await supabase
        .from('devices')
        .select('*, users(email)');
      if (devicesErr) throw devicesErr;

      // 3. Fetch Logs
      const { data: logsData, error: logsErr } = await supabase
        .from('activity_logs')
        .select('*, users(email)')
        .order('date', { ascending: false });
      if (logsErr) throw logsErr;

      setUsers(usersData || []);
      
      const formattedDevices = (devicesData || []).map((d: any) => ({
        ...d,
        user_email: d.users?.email || 'Inconnu'
      }));
      setDevices(formattedDevices);

      const formattedLogs = (logsData || []).map((l: any) => ({
        ...l,
        user_email: l.users?.email || 'Système'
      }));
      setLogs(formattedLogs);
    } catch (err) {
      console.error('Erreur chargement données admin:', err);
      showToast("Erreur lors du chargement des données d'administration.", "error");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await fetchAdminData();
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const authorized = await checkAdminRole();
      if (authorized) {
        await fetchAdminData();
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleToggleUserBlock = async (userId: string, currentRole: string) => {
    if (userId === currentUserId) {
      showToast("Vous ne pouvez pas bloquer votre propre compte administrateur.", "error");
      return;
    }
    setActionInProgress(userId);
    const newRole = currentRole === 'Bloqué' ? 'Employé' : 'Bloqué';
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      // Log Action
      await supabase.from('activity_logs').insert({
        action: newRole === 'Bloqué' ? 'BLOCAGE_UTILISATEUR' : 'DEBLOCAGE_UTILISATEUR',
        description: `${newRole === 'Bloqué' ? 'Blocage' : 'Déblocage'} de l'utilisateur ID ${userId}`
      });
      showToast(`L'utilisateur a été ${newRole === 'Bloqué' ? 'bloqué' : 'débloqué'} avec succès.`, "success");
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la modification de l'utilisateur.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleDeviceBlock = async (deviceId: string, currentStatus: string) => {
    setActionInProgress(deviceId);
    const newStatus = currentStatus === 'blocked' ? 'online' : 'blocked';
    try {
      const { error } = await supabase
        .from('devices')
        .update({ statut: newStatus })
        .eq('id', deviceId);
      if (error) throw error;

      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, statut: newStatus } : d));

      // Log Action
      await supabase.from('activity_logs').insert({
        action: newStatus === 'blocked' ? 'BLOCAGE_APPAREIL' : 'DEBLOCAGE_APPAREIL',
        description: `${newStatus === 'blocked' ? 'Blocage' : 'Déblocage'} de l'appareil ID ${deviceId}`
      });
      showToast(`L'appareil a été ${newStatus === 'blocked' ? 'bloqué' : 'débloqué'} avec succès.`, "success");
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la modification de l'appareil.", "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const openConfirmUserBlock = (userId: string, currentRole: string, email: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'user',
      id: userId,
      label: email || userId,
      currentValue: currentRole
    });
  };

  const openConfirmDeviceBlock = (deviceId: string, currentStatus: string, deviceName: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'device',
      id: deviceId,
      label: deviceName || deviceId,
      currentValue: currentStatus
    });
  };

  const handleConfirmAction = async () => {
    const { type, id, currentValue } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    if (type === 'user') {
      await handleToggleUserBlock(id, currentValue);
    } else {
      await handleToggleDeviceBlock(id, currentValue);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.nom && u.nom.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.departement && u.departement.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDevices = devices.filter(d => 
    d.nom_appareil.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.adresse_ip.includes(searchQuery) ||
    d.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-800">Accès Refusé</h2>
        <p className="text-slate-500 max-w-md">
          Cette section est réservée aux administrateurs réseau d'OfficeLink. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support technique.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Panneau d'Administration OfficeLink
          </h2>
          <p className="text-slate-500">Gérez la sécurité locale, les comptes d'employés et l'activité réseau.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </header>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button 
          onClick={() => { setActiveTab('stats'); setSearchQuery(''); }}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <BarChart2 className="w-4 h-4" /> Vue d'ensemble
        </button>
        <button 
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Users className="w-4 h-4" /> Employés ({users.length})
        </button>
        <button 
          onClick={() => { setActiveTab('devices'); setSearchQuery(''); }}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'devices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Laptop className="w-4 h-4" /> Appareils ({devices.length})
        </button>
        <button 
          onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
          className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Activity className="w-4 h-4" /> Logs Réseau ({logs.length})
        </button>
      </div>

      {/* Search Filter for List Tabs */}
      {activeTab !== 'stats' && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      )}

      {/* Tab Contents */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          Chargement des données administratives...
        </div>
      ) : (
        <>
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium">Total Employés</h3>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{users.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Enregistrés dans la base</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium">Appareils Enregistrés</h3>
                  <p className="text-3xl font-extrabold text-blue-600 mt-2">{devices.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Autorisés ou bloqués</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium">Appareils Bloqués</h3>
                  <p className="text-3xl font-extrabold text-red-600 mt-2">
                    {devices.filter(d => d.statut === 'blocked').length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Accès réseau révoqué</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium">Logs d'Activité Réseau</h3>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">{logs.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Événements enregistrés</p>
                </div>
              </div>

              {/* Warnings/Security Alert */}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex gap-4 items-start">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">Contrôle d'accès actif</h4>
                  <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                    Seuls les employés authentifiés et les appareils approuvés peuvent échanger des fichiers sur l'intranet LAN. 
                    Vous pouvez révoquer instantanément l'accès d'un appareil ou d'un utilisateur ci-dessous.
                  </p>
                </div>
              </div>

              {/* Quick Actions / Recent Device Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 text-lg mb-4">Activité Réseau Récente</h3>
                {logs.length === 0 ? (
                  <p className="text-slate-400 text-sm py-4 text-center">Aucun événement réseau enregistré.</p>
                ) : (
                  <div className="space-y-4">
                    {logs.slice(0, 5).map(log => (
                      <div key={log.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl text-sm border border-slate-100 hover:bg-slate-100/50 transition-colors">
                        <div>
                          <p className="font-semibold text-slate-800">{log.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{new Date(log.date).toLocaleString('fr-FR')}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-xs">{log.user_email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-4 px-6">Employé</th>
                    <th className="py-4 px-6">Rôle / Droit</th>
                    <th className="py-4 px-6">Service</th>
                    <th className="py-4 px-6">Statut Connexion</th>
                    <th className="py-4 px-6 text-center">Actions Sécurité</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">Aucun employé trouvé.</td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">
                                {user.prenom || user.nom ? `${user.prenom || ''} ${user.nom || ''}` : 'Utilisateur sans nom'}
                              </p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            user.role === 'Super Administrateur' 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                              : user.role === 'Bloqué'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{user.departement || 'Non spécifié'}</td>
                        <td className="py-4 px-6">
                          <span className="flex items-center gap-2 font-medium">
                            <span className={`w-2 h-2 rounded-full ${user.statut === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            {user.statut === 'online' ? 'Connecté' : 'Hors ligne'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => openConfirmUserBlock(user.id, user.role, user.email)}
                            disabled={actionInProgress === user.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 mx-auto ${
                              user.role === 'Bloqué'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            }`}
                          >
                            {user.role === 'Bloqué' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" /> Débloquer l'accès
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" /> Bloquer l'accès
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-4 px-6">Nom Appareil</th>
                    <th className="py-4 px-6">OS / Système</th>
                    <th className="py-4 px-6">IP Locale</th>
                    <th className="py-4 px-6">Propriétaire</th>
                    <th className="py-4 px-6">Statut Sécurité</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">Aucun appareil détecté.</td>
                    </tr>
                  ) : (
                    filteredDevices.map(device => (
                      <tr key={device.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="py-4 px-6 font-bold text-slate-800">{device.nom_appareil}</td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                            {device.systeme_exploitation}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-600">{device.adresse_ip}</td>
                        <td className="py-4 px-6 text-slate-600">{device.user_email}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            device.statut === 'blocked'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {device.statut === 'blocked' ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Bloqué
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" /> Approuvé
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => openConfirmDeviceBlock(device.id, device.statut, device.nom_appareil)}
                            disabled={actionInProgress === device.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              device.statut === 'blocked'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            }`}
                          >
                            {device.statut === 'blocked' ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Action</th>
                    <th className="py-4 px-6">Détails de l'Activité</th>
                    <th className="py-4 px-6">Utilisateur Réseau</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">Aucun log trouvé.</td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                          {new Date(log.date).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-700">{log.action}</td>
                        <td className="py-4 px-6 text-slate-600">{log.description}</td>
                        <td className="py-4 px-6 text-slate-600 font-medium">{log.user_email}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">Confirmer l'action</h3>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Voulez-vous vraiment {confirmModal.currentValue === 'Bloqué' || confirmModal.currentValue === 'blocked' ? 'débloquer' : 'bloquer'} l'accès pour{' '}
              <span className="font-semibold text-slate-800">{confirmModal.label}</span> ?
              {confirmModal.currentValue !== 'Bloqué' && confirmModal.currentValue !== 'blocked' && (
                <span className="block mt-2 text-xs text-red-500 font-medium">
                  Cette action révoquera immédiatement son droit d'échange de fichiers et de communication sur l'intranet.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-3 text-sm font-semibold">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm shadow-blue-200"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

