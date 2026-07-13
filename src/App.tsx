/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Intervention, TechProfile } from "./types";
import { INITIAL_INTERVENTIONS } from "./data/constants";
import StatsDashboard from "./components/StatsDashboard";
import NewInterventionForm from "./components/NewInterventionForm";
import InterventionsRegistry from "./components/InterventionsRegistry";
import ProfessionalFiche from "./components/ProfessionalFiche";
import SettingsProfile from "./components/SettingsProfile";
import { 
  PlusCircle, 
  Table, 
  Settings, 
  TrendingUp, 
  X,
  CheckCircle2
} from "lucide-react";
import { 
  getDirectoryHandle, 
  saveDirectoryHandle, 
  deleteDirectoryHandle, 
  writeJsonToDirectory 
} from "./utils/localDiskStorage";
import { generateAndDownloadPDF, generateAndDownloadPhotosPDF } from "./utils/pdfGenerator";
import { 
  supabase, 
  getSession, 
  getUserProfile, 
  saveUserProfile, 
  fetchInterventions, 
  saveIntervention, 
  deleteIntervention as deleteInterventionSb, 
  checkAndCleanupInterventions 
} from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
interface AppProps {
  embedded?: boolean;
}

export default function App({ embedded = false }: AppProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Stored states
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [techProfile, setTechProfile] = useState<TechProfile>({
    name: "Technicien",
    title: "Ingénieur Support",
    department: "DSI",
    centerName: "CNIPLC"
  });

  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localDirName, setLocalDirName] = useState<string>("");

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "new" | "registry" | "settings">("dashboard");
  
  // Selected intervention for printing/viewing
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  // Theme settings (persisted in local storage)
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("cniplc_theme") as "light" | "dark") || "light"
  );

  const isDark = theme === "dark";

  // Discrete status toast notification state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false
  });

  // Automatically hide toast notification after 4 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, toast.message]);

  const showToastNotification = (msg: string) => {
    setToast({
      message: msg,
      visible: true
    });
  };

  const handleToggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("cniplc_theme", newTheme);
  };

  // Setup global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;
      const char = e.key.toLowerCase();
      
      // We look for modifier keys (Ctrl or Alt or Meta/Cmd)
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      if (hasModifier) {
        if (char === "n") {
          e.preventDefault();
          setActiveTab("new");
          showToastNotification("Raccourci activé : Saisie d'intervention (Alt+N / Ctrl+N)");
        } else if (char === "b" || char === "d") {
          e.preventDefault();
          setActiveTab("dashboard");
          showToastNotification("Raccourci activé : Tableau de Bord (Alt+B / Ctrl+B)");
        } else if (char === "r" || char === "h") {
          e.preventDefault();
          setActiveTab("registry");
          showToastNotification("Raccourci activé : Registre des Activités (Alt+R / Ctrl+R)");
        } else if (char === "s" || char === "p") {
          e.preventDefault();
          setActiveTab("settings");
          showToastNotification("Raccourci activé : Préférences (Alt+S / Ctrl+S)");
        }
      } else if (e.key === "Escape") {
        if (selectedIntervention) {
          e.preventDefault();
          setSelectedIntervention(null);
          showToastNotification("Aperçu de la fiche d'intervention fermé (Échap)");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIntervention]);

  // Load directory handle and interventions on mount
  useEffect(() => {
    async function loadSavedDirectory() {
      try {
        const handle = await getDirectoryHandle();
        if (handle) {
          setLocalDirHandle(handle);
          setLocalDirName(handle.name);
        }
      } catch (err) {
        console.error("Failed to load saved directory handle:", err);
      }
    }
    loadSavedDirectory();
  }, []);

  // Fetch auth session on mount
  useEffect(() => {
    // 1. Try to load cached session first for instant UI response
    const cachedSessionStr = localStorage.getItem('officelink_session');
    let cachedSession: Session | null = null;
    if (cachedSessionStr) {
      try {
        cachedSession = JSON.parse(cachedSessionStr);
        setSession(cachedSession);
        setAuthLoading(false);
      } catch (e) {
        console.error("Failed to parse cached session in App", e);
      }
    }

    getSession().then((session) => {
      if (session) {
        setSession(session);
        localStorage.setItem('officelink_session', JSON.stringify(session));
      } else if (!cachedSession) {
        setSession(null);
        localStorage.removeItem('officelink_session');
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        localStorage.setItem('officelink_session', JSON.stringify(session));
      } else {
        // Only clear session if it was an explicit SIGNED_OUT or no cache exists
        if (event === 'SIGNED_OUT' || !localStorage.getItem('officelink_session')) {
          setSession(null);
          localStorage.removeItem('officelink_session');
          setAuthLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch interventions & profile from DB when session changes
  useEffect(() => {
    if (!session) return;
    
    // Load profile
    getUserProfile(session.user.id).then((profile) => {
      if (profile) setTechProfile(profile);
    });

    fetchInterventions().then(data => setInterventions(data));

    // Load Local Directory backup folder mapping from IndexedDB
    getDirectoryHandle().then(handle => {
      if (handle) {
        setLocalDirHandle(handle);
        setLocalDirName(handle.name);
      }
    });
  }, [session]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setToast({ message: "Inscription réussie ! Vous pouvez maintenant vous connecter.", visible: true });
        setIsLoginMode(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "Erreur d'authentification");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleConnectDirectory = async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      await saveDirectoryHandle(dirHandle);
      setLocalDirHandle(dirHandle);
      setLocalDirName(dirHandle.name);
      showToastNotification("Dossier de sauvegarde direct connecté !");
    } catch (err) {
      console.error("User cancelled or directory select failed.", err);
    }
  };

  const handleDisconnectDirectory = async () => {
    await deleteDirectoryHandle();
    setLocalDirHandle(null);
    setLocalDirName("");
    alert("Dossier de sauvegarde locale déconnecté.");
  };

  // Save changes helper
  const saveToLocalStorage = (newList: Intervention[]) => {
    setInterventions(newList);
    localStorage.setItem("cniplc_interventions", JSON.stringify(newList));
  };

  // Handlers
  const handleSaveIntervention = async (newInt: Omit<Intervention, "id" | "refNumber" | "created_at">) => {
    const id = `int-${Date.now()}`;
    const refNumber = `REF-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
    const created_at = new Date().toISOString();
    
    // Default signatureDate only if "termine"
    const signatureDate = newInt.status === "termine" ? newInt.date : undefined;

    const fullIntervention: Intervention = {
      ...newInt,
      id,
      refNumber,
      created_at,
      signatureDate,
      user_id: session?.user.id
    } as Intervention;

    const updatedList = [fullIntervention, ...interventions];
    setInterventions(updatedList);

    try {
      await saveIntervention(fullIntervention);
      
      // Check auto-cleanup (passing the directory handle so it saves locally)
      const cleaned = await checkAndCleanupInterventions(updatedList, localDirHandle);
      if (cleaned) {
        showToastNotification("Quota atteint : Sauvegarde PDF locale effectuée et purge Supabase réussie.");
        fetchInterventions().then(setInterventions);
      } else {
        // If not cleaned, we just show a normal success
        showToastNotification("Intervention consignée avec succès dans Supabase !");
      }

      // Auto Backup Local JSON
      if (localDirHandle) {
        try {
          const content = JSON.stringify(updatedList, null, 2);
          await writeJsonToDirectory(localDirHandle, "backup_interventions.json", content);
          console.log("Local directory backup completed.");
        } catch (backupErr) {
          console.error("Local backup failed:", backupErr);
          // Optional: show a warning toast that local backup failed
        }
      }
    } catch (err) {
      console.error("Supabase Save Error:", err);
      showToastNotification("Erreur lors de la sauvegarde Supabase.");
    }

    // Immediately compile and trigger PDF download/save
    try {
      await generateAndDownloadPDF(fullIntervention, localDirHandle);
      if (fullIntervention.photos && fullIntervention.photos.length > 0) {
        await generateAndDownloadPhotosPDF(fullIntervention, localDirHandle);
      }
    } catch (e) {
      console.error("Auto PDF generation failed:", e);
    }
    
    setActiveTab("registry");
  };

  const handleDeleteIntervention = async (id: string) => {
    const newList = interventions.filter(i => i.id !== id);
    setInterventions(newList);
    localStorage.setItem("cniplc_interventions", JSON.stringify(newList));
    
    try {
      await deleteInterventionSb(id);
    } catch (err) {
      console.error("Failed to delete from Supabase:", err);
    }

    if (selectedIntervention?.id === id) {
      setSelectedIntervention(null);
    }
  };

  const handleToggleStatus = async (id: string) => {
    let updatedInt: Intervention | null = null;
    const newList = interventions.map(i => {
      if (i.id === id) {
        const nextStatus = i.status === "termine" ? "en_cours" : "termine";
        updatedInt = {
          ...i,
          status: nextStatus,
          signatureDate: nextStatus === "termine" ? new Date().toISOString().substring(0, 10) : undefined
        };
        return updatedInt as Intervention;
      }
      return i;
    });
    setInterventions(newList);
    localStorage.setItem("cniplc_interventions", JSON.stringify(newList));

    if (updatedInt) {
      try {
        await saveIntervention(updatedInt);
      } catch (err) {
        console.error("Failed to update status in Supabase:", err);
      }
    }

    const toggledItem = newList.find(item => item.id === id);
    const label = toggledItem?.status === "termine" ? "Clôturée" : "En cours d'intervention";
    showToastNotification(`Statut mis à jour : ${label} !`);
    // Sync active select preview
    if (selectedIntervention?.id === id) {
      const updated = newList.find(t => t.id === id);
      if (updated) setSelectedIntervention(updated);
    }
  };

  const handleSaveProfile = async (updatedProfile: TechProfile) => {
    setTechProfile(updatedProfile);
    if (session) {
      try {
        await saveUserProfile(session.user.id, updatedProfile);
      } catch (err) {
        console.error("Failed to save profile to Supabase:", err);
      }
    }
  };

  // Export database to standard JSON file
  const handleExportData = () => {
    const dataStr = JSON.stringify(interventions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `CNIPLC_REGISTRE_IT_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Export database to standard CSV spreadsheet file (compatible with Excel, LibreOffice, Google Sheets)
  const handleExportCSV = () => {
    // Semicolon values is preferred in standard French Excel systems
    const headers = [
      "Référence",
      "Date d'intervention",
      "Technicien IT",
      "Bénéficiaire d'État",
      "Titre Bénéficiaire",
      "Département / Direction",
      "Type d'Équipement",
      "Marque / Modèle",
      "N° Inventaire",
      "Durée (min)",
      "Statut",
      "Synthèse d'Intervention"
    ];

    const rows = interventions.map((item) => {
      return [
        item.refNumber,
        new Date(item.date).toLocaleDateString('fr-FR'),
        item.techName,
        item.clientName,
        item.clientTitle,
        item.clientDepartment,
        item.deviceType,
        item.deviceBrand || "",
        item.deviceInventory || "N/A",
        item.durationMinutes.toString(),
        item.status === "termine" ? "Terminée" : "En cours",
        // Clean line breaks and escape quotes
        item.professionalSummary.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')
      ];
    });

    // Write CSV data with UTF-8 BOM so french accents display cleanly in Microsoft Excel
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => `"${val}"`).join(";"))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', `CNIPLC_REGISTRE_CSV_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  };

  // Import previously saved JSON files
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            saveToLocalStorage(parsed);
            alert("Base de données importée et synchronisée avec succès !");
          } else {
            alert("Erreur de format: Le fichier sélectionné n'est pas un registre d'interventions valide.");
          }
        } catch (error) {
          alert("Erreur lors de la lecture du fichier de sauvegarde.");
        }
      };
    }
  };

  const handleResetFactory = () => {
    saveToLocalStorage(INITIAL_INTERVENTIONS);
    alert("Les données d'exemples ont été réinjectées au registre.");
  };

  const handleClearData = () => {
    saveToLocalStorage([]);
    alert("Toutes les données du registre ont été purgées définitivement.");
  };

  const handlePrint = () => {
    window.print();
  };

  // -------------
  // AUTH RENDERING
  // -------------
  if (authLoading) {
    if (embedded) return <div className="flex items-center justify-center py-16"><p className="text-xl font-medium animate-pulse">Chargement...</p></div>;
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <p className="text-xl font-medium animate-pulse">Chargement de la session...</p>
      </div>
    );
  }

  if (!session) {
    if (embedded) return <div className="flex items-center justify-center py-16 text-slate-500"><p>Veuillez vous reconnecter.</p></div>;
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center mb-8">
            <img src="/logo.jpeg" alt="CNIPLC Logo" className="h-20 w-20 object-contain mx-auto mb-4 rounded-2xl shadow-lg" />
            <h1 className="text-2xl font-bold text-teal-600 mb-2">CNIPLC - Registre IT Pro</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Commission Nationale Indépendante pour la Prévention et la Lutte contre la Corruption
            </p>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Connectez-vous à votre espace technique sécurisé
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email Professionnel</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
                placeholder="prenom.nom@cniplc.dj"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Mot de passe</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-100 text-red-600 text-sm font-medium text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
            >
              {isLoginMode ? "Se Connecter" : "Créer un compte"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className={`text-sm font-medium hover:underline ${isDark ? 'text-teal-400' : 'text-teal-600'}`}
            >
              {isLoginMode ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>

        {/* Global Toast Notification for Auth */}
        <AnimatePresence>
          {toast.visible && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-[100] bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 font-medium text-sm flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="text-teal-400" />
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // -------------
  // MAIN APP
  // -------------

  // When embedded inside OfficeLink Layout, only render the internal content
  if (embedded) {
    return (
      <div className={`transition-colors duration-200 font-sans ${isDark ? "text-slate-100" : "text-slate-900"}`}>
        {/* Internal tab navigator */}
        <nav className={`no-print border-b mb-6 transition-colors duration-200 ${
          isDark ? "border-slate-800" : "border-slate-200/80"
        }`}>
          <div className="flex space-x-1 overflow-x-auto scrollbar-none py-1.5">
            <button onClick={() => setActiveTab("dashboard")} className={`px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "dashboard" ? "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
              <TrendingUp className="w-4 h-4 text-teal-600" /> Tableau de Bord
            </button>
            <button onClick={() => setActiveTab("new")} className={`px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "new" ? "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
              <PlusCircle className="w-4 h-4 text-teal-600" /> Consigner
            </button>
            <button onClick={() => setActiveTab("registry")} className={`px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "registry" ? "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
              <Table className="w-4 h-4 text-teal-600" /> Registre <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700">{interventions.length}</span>
            </button>
            <button onClick={() => setActiveTab("settings")} className={`px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "settings" ? "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
              <Settings className="w-4 h-4 text-teal-600" /> Préférences
            </button>
          </div>
        </nav>

        <AnimatePresence mode="popLayout">
          {selectedIntervention && activeTab === "registry" && (
            <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="mb-8 border rounded-2xl p-4 relative shadow-sm max-w-4xl mx-auto bg-teal-50/10 border-teal-150">
              <button onClick={() => setSelectedIntervention(null)} className="absolute top-4 right-4 p-1 rounded-full cursor-pointer hover:shadow transition-all z-10 border bg-white border-slate-200 text-slate-405 hover:text-slate-600" title="Masquer">
                <X className="w-4 h-4" />
              </button>
              <ProfessionalFiche intervention={selectedIntervention} onPrint={handlePrint} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><StatsDashboard interventions={interventions} theme={theme} /></motion.div>}
          {activeTab === "new" && <motion.div key="new" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><NewInterventionForm onSave={handleSaveIntervention} techProfile={techProfile} theme={theme} interventions={interventions} /></motion.div>}
          {activeTab === "registry" && <motion.div key="registry" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><InterventionsRegistry interventions={interventions} onSelect={setSelectedIntervention} onDelete={handleDeleteIntervention} onToggleStatus={handleToggleStatus} theme={theme} /></motion.div>}
          {activeTab === "settings" && <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><SettingsProfile techProfile={techProfile} onSaveProfile={handleSaveProfile} onExportData={handleExportData} onExportCSV={handleExportCSV} onImportData={handleImportData} onResetFactory={handleResetFactory} onClearData={handleClearData} localDirName={localDirName} onConnectDirectory={handleConnectDirectory} onDisconnectDirectory={handleDisconnectDirectory} theme={theme} onToggleTheme={handleToggleTheme} /></motion.div>}
        </AnimatePresence>

        <AnimatePresence>
          {toast.visible && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md text-xs font-semibold no-print max-w-sm w-[calc(100%-2rem)] bg-white border-teal-200 text-teal-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-500" />
              <div className="flex-1">{toast.message}</div>
              <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="p-0.5 rounded-full hover:bg-slate-200/20 text-slate-500"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"}`}>
      <header className={`no-print relative border-b transition-colors duration-200 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpeg" 
              alt="CNIPLC Logo" 
              className="h-11 w-11 object-contain rounded-xl shadow-md border border-slate-200/50"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                Registre IT Pro
              </h1>
              <p className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                CNIPLC - {techProfile.centerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Visual Indicator for Connected Folder */}
            {localDirHandle && (
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                <span>📁 Dossier Connecté:</span>
                <span className="truncate max-w-[100px] font-bold">{localDirName}</span>
              </div>
            )}
            
            {/* User quick badge status */}
            <div className="flex items-center gap-2">
              <div className="text-right text-xs hidden md:block">
                <span className="text-slate-400 block font-medium">Connecté(e)</span>
                <strong className="text-teal-400 text-sm font-semibold">{techProfile.name}</strong>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-teal-500/80 flex items-center justify-center font-bold text-teal-400 text-base shadow uppercase cursor-pointer" title="Déconnexion" onClick={handleLogout}>
                {techProfile.name[0] || 'T'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Primary tab navigator */}
      <nav className={`no-print border-b transition-colors duration-200 ${
        isDark ? "bg-slate-900 border-slate-800 shadow-lg shadow-teal-500/5" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto scrollbar-none py-1.5">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-3 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "dashboard"
                ? isDark
                  ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500 shadow-md"
                  : "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>Tableau de Bord</span>
            <kbd className={`ml-1 px-1 py-0.5 text-[9px] font-mono rounded font-bold hidden lg:inline-block ${
              isDark ? "bg-slate-950 border border-slate-850 text-teal-400" : "bg-slate-100 border border-slate-200 text-slate-500"
            }`}>Alt+B</kbd>
          </button>

          <button
            id="nav-tab-new"
            onClick={() => setActiveTab("new")}
            className={`px-4 py-3 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "new"
                ? isDark
                  ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500 shadow-md"
                  : "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>Consigner une Intervention</span>
            <kbd className={`ml-1 px-1 py-0.5 text-[9px] font-mono rounded font-bold hidden lg:inline-block ${
              isDark ? "bg-slate-950 border border-slate-850 text-teal-400" : "bg-slate-100 border border-slate-200 text-slate-500"
            }`}>Alt+N</kbd>
          </button>

          <button
            id="nav-tab-registry"
            onClick={() => setActiveTab("registry")}
            className={`px-4 py-3 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "registry"
                ? isDark
                  ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500 shadow-md"
                  : "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Table className="w-4 h-4 text-teal-600" />
            <span>Registre & Fiches</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
              isDark ? "bg-slate-750 text-slate-300" : "bg-slate-200 text-slate-750"
            }`}>
              {interventions.length}
            </span>
            <kbd className={`ml-1 px-1 py-0.5 text-[9px] font-mono rounded font-bold hidden lg:inline-block ${
              isDark ? "bg-slate-950 border border-slate-850 text-teal-400" : "bg-slate-100 border border-slate-200 text-slate-500"
            }`}>Alt+R</kbd>
          </button>

          <button
            id="nav-tab-settings"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-3 text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "settings"
                ? isDark
                  ? "bg-slate-800 text-teal-400 border-b-2 border-teal-500 shadow-md"
                  : "bg-teal-50/80 text-teal-800 border-b-2 border-teal-600 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-4 h-4 text-teal-600" />
            <span>Préférences</span>
            <kbd className={`ml-1 px-1 py-0.5 text-[9px] font-mono rounded font-bold hidden lg:inline-block ${
              isDark ? "bg-slate-950 border border-slate-850 text-teal-400" : "bg-slate-100 border border-slate-200 text-slate-500"
            }`}>Alt+S</kbd>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8 no-print">
        <AnimatePresence mode="popLayout">
          {selectedIntervention && activeTab === "registry" && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className={`mb-8 border rounded-2xl p-4 relative shadow-sm max-w-4xl mx-auto ${
                isDark ? "bg-slate-900/40 border-slate-800" : "bg-teal-50/10 border-teal-150"
              }`}
            >
              <button
                onClick={() => setSelectedIntervention(null)}
                className={`absolute top-4 right-4 p-1 rounded-full cursor-pointer hover:shadow transition-all z-10 border ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" : "bg-white border-slate-200 text-slate-405 hover:text-slate-600"
                }`}
                title="Masquer l'aperçu"
              >
                <X className="w-4 h-4" />
              </button>
              <ProfessionalFiche 
                intervention={selectedIntervention} 
                onPrint={handlePrint} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic tabs components routing with clean slide and fade entry */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <StatsDashboard interventions={interventions} theme={theme} />
            </motion.div>
          )}

          {activeTab === "new" && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <NewInterventionForm 
                onSave={handleSaveIntervention} 
                techProfile={techProfile}
                theme={theme}
                interventions={interventions}
              />
            </motion.div>
          )}

          {activeTab === "registry" && (
            <motion.div
              key="registry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <InterventionsRegistry
                interventions={interventions}
                onSelect={setSelectedIntervention}
                onDelete={handleDeleteIntervention}
                onToggleStatus={handleToggleStatus}
                theme={theme}
              />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsProfile
                techProfile={techProfile}
                onSaveProfile={handleSaveProfile}
                onExportData={handleExportData}
                onExportCSV={handleExportCSV}
                onImportData={handleImportData}
                onResetFactory={handleResetFactory}
                onClearData={handleClearData}
                localDirName={localDirName}
                onConnectDirectory={handleConnectDirectory}
                onDisconnectDirectory={handleDisconnectDirectory}
                theme={theme}
                onToggleTheme={handleToggleTheme}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Dynamic Toast Status Notification Alert */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md text-xs font-semibold no-print max-w-sm w-[calc(100%-2rem)]"
            style={{
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.92)",
              borderColor: isDark ? "rgba(20, 184, 166, 0.35)" : "rgba(20, 184, 166, 0.25)",
              color: isDark ? "#2dd4bf" : "#0f766e"
            }}
          >
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-teal-500" />
            <div className="flex-1 font-sans">
              {toast.message}
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className={`p-0.5 rounded-full hover:bg-slate-200/20 transition-colors cursor-pointer ${
                isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background full-size Printable Page Container exclusively visible when printing */}
      {selectedIntervention ? (
        <div id="print-area-only" className="hidden print:block absolute left-0 top-0 w-full bg-white text-black p-0">
          <ProfessionalFiche 
            intervention={selectedIntervention} 
            onPrint={handlePrint} 
          />
        </div>
      ) : (
        <div id="print-area-fallback" className="hidden print:block absolute left-0 top-0 w-full text-center p-10 font-mono text-sm">
          Pour imprimer une attestation administrative officielle, veuillez d'abord sélectionner une ligne dans l'historique et cliquer sur "Imprimer" pour générer la mise en page correcte de signature.
        </div>
      )}

      {/* Footer copyright */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 text-center text-xs mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} - Registre d'Archives de Prestations et Service Fait d'État.</p>
          <p className="text-[10px] text-slate-650 font-mono">
            Développé pour les services informatiques du CNIPLC • Soumis aux règles de traçabilité administrative d'État.
          </p>
        </div>
      </footer>
    </div>
  );
}
