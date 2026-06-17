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
import { fetchInterventions, saveIntervention, deleteIntervention as deleteInterventionSb, checkAndCleanupInterventions } from "./lib/supabase";

export default function App() {
  // Stored states
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [techProfile, setTechProfile] = useState<TechProfile>({
    name: "Said Awaleh",
    title: "Ingénieur Support Informatique",
    department: "Systèmes d'Information (DSI)",
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

  // Set up local file picker actions
  const handleConnectDirectory = async () => {
    try {
      const win = window as any;
      if (!win.showDirectoryPicker) {
        alert("Votre navigateur ne supporte pas l'accès direct aux dossiers locaux (l'API FileSystem Access). Veuillez utiliser Google Chrome, Microsoft Edge ou Opera sur ordinateur.");
        return;
      }
      const handle = await win.showDirectoryPicker({
        mode: "readwrite"
      });
      await saveDirectoryHandle(handle);
      setLocalDirHandle(handle);
      setLocalDirName(handle.name);
      alert(`Dossier local "${handle.name}" connecté avec succès comme stockage professionnel ! Les fiches d'intervention JSON y seront enregistrées automatiquement.`);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error picking directory:", err);
        alert("Impossible de sélectionner le dossier : " + err.message);
      }
    }
  };

  const handleDisconnectDirectory = async () => {
    await deleteDirectoryHandle();
    setLocalDirHandle(null);
    setLocalDirName("");
    alert("Dossier de sauvegarde locale déconnecté.");
  };

  // Load from local storage on mount
  useEffect(() => {
    async function loadData() {
      const savedProfile = localStorage.getItem("cniplc_tech_profile");
      if (savedProfile) {
        try {
          setTechProfile(JSON.parse(savedProfile));
        } catch (e) {}
      }

      try {
        const sbData = await fetchInterventions();
        if (sbData && sbData.length > 0) {
          setInterventions(sbData);
          localStorage.setItem("cniplc_interventions", JSON.stringify(sbData));
        } else {
          const list = localStorage.getItem("cniplc_interventions");
          if (list) {
            setInterventions(JSON.parse(list));
          } else {
            setInterventions(INITIAL_INTERVENTIONS);
            localStorage.setItem("cniplc_interventions", JSON.stringify(INITIAL_INTERVENTIONS));
          }
        }
      } catch (err) {
        console.error("Supabase load error:", err);
        const list = localStorage.getItem("cniplc_interventions");
        if (list) {
          setInterventions(JSON.parse(list));
        } else {
          setInterventions(INITIAL_INTERVENTIONS);
        }
      }
    }
    loadData();
  }, []);

  // Save changes helper
  const saveToLocalStorage = (newList: Intervention[]) => {
    setInterventions(newList);
    localStorage.setItem("cniplc_interventions", JSON.stringify(newList));
  };

  // Handlers
  const handleCreateIntervention = async (formData: Omit<Intervention, "id" | "refNumber" | "createdAt">) => {
    // Generate unique index/ref
    const count = interventions.length + 1;
    const padding = count.toString().padStart(4, "0");
    const currentYear = new Date().getFullYear();
    const refNumber = `${techProfile.centerName || 'CNIPLC'}-${currentYear}-${padding}`;
    const id = `int-${Date.now()}`;

    const newInt: Intervention = {
      ...formData,
      id,
      refNumber,
      createdAt: new Date().toISOString()
    };

    let newList = [newInt, ...interventions];
    setInterventions(newList);
    localStorage.setItem("cniplc_interventions", JSON.stringify(newList));

    // Save to Supabase
    try {
      await saveIntervention(newInt);
      
      // Auto-cleanup check
      const didCleanup = await checkAndCleanupInterventions(newList);
      if (didCleanup) {
        showToastNotification("Compte-rendu généré et données Supabase nettoyées (20 interventions).");
        newList = await fetchInterventions();
        setInterventions(newList);
        localStorage.setItem("cniplc_interventions", JSON.stringify(newList));
      }
    } catch (err) {
      console.error("Failed to save to Supabase:", err);
    }

    showToastNotification(`Nouvelle intervention (${newInt.refNumber}) créée et enregistrée avec succès au registre !`);

    const downloadName = `CNIPLC_Fiche_${newInt.refNumber.replace(/\s+/g, "_")}.json`;
    const dataStr = JSON.stringify(newInt, null, 2);

    // 1. Immediately compile and trigger PDF download as requested
    try {
      await generateAndDownloadPDF(newInt);
      if (newInt.photos && newInt.photos.length > 0) {
        await generateAndDownloadPhotosPDF(newInt);
      }
    } catch (e) {
      console.error("Auto PDF generation failed:", e);
    }

    // 2. Direct local disk storage routing
    if (localDirHandle) {
      try {
        await writeJsonToDirectory(localDirHandle, downloadName, dataStr);
        console.log(`Automatic background save succeeded: ${downloadName} stored in user-selected folder.`);
      } catch (err: any) {
        console.error("Autosave to connected directory failed:", err);
        alert(`Attention : la sauvegarde automatique dans le dossier "${localDirName}" a échoué. Le fichier JSON va être téléchargé via le navigateur.`);
        
        // Fallback standard browser download
        triggerBrowserDownload(downloadName, dataStr);
      }
    } else {
      // Fallback standard browser download for JSON
      triggerBrowserDownload(downloadName, dataStr);
      
      // Educational professional prompt
      setTimeout(() => {
        alert(
          "Fiche d'intervention et attestation d'État enregistrées avec succès !\n\n" +
          "💡 Astuce Professionnelle CNIPLC : " +
          "Vous pouvez connecter un dossier permanent de votre disque dur (ex: votre dossier Documents ou une clé USB) " +
          "dans l'onglet 'Préférences' pour sauvegarder vos fiches automatiquement sans aucune question du navigateur."
        );
      }, 500);
    }
    
    // Auto shift to registry & select for immediate print view
    setActiveTab("registry");
    setSelectedIntervention(newInt);
  };

  const triggerBrowserDownload = (fileName: string, content: string) => {
    try {
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', fileName);
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
    } catch (e) {
      console.error("Browser download failed:", e);
    }
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
  };
    const toggledItem = newList.find(item => item.id === id);
    const label = toggledItem?.status === "termine" ? "Clôturée" : "En cours d'intervention";
    showToastNotification(`Statut mis à jour : ${label} !`);
    // Sync active select preview
    if (selectedIntervention?.id === id) {
      const updated = newList.find(t => t.id === id);
      if (updated) setSelectedIntervention(updated);
    }
  };

  const handleSaveProfile = (updatedProfile: TechProfile) => {
    setTechProfile(updatedProfile);
    localStorage.setItem("cniplc_tech_profile", JSON.stringify(updatedProfile));
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

  return (
    <div className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
      isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* State Official Banner Header */}
      <header className="bg-slate-900 text-white shadow-md border-b-2 border-teal-500/80 no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/60 p-1 rounded-xl border border-teal-500/40 shadow-inner shrink-0 flex items-center justify-center">
              <img 
                src="/logo.jpeg" 
                alt="CNIPLC Logo" 
                className="h-12 w-12 object-contain rounded" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">
                  République de Djibouti - Administration Informatique
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                {techProfile.centerName || "CNIPLC"} - Registre des Interventions IT
              </h1>
            </div>
          </div>

          {/* User quick badge status */}
          <div className="flex items-center gap-2">
            <div className="text-right text-xs hidden md:block">
              <span className="text-slate-400 block font-medium">Informaticien de Service</span>
              <strong className="text-teal-400 text-sm font-semibold">{techProfile.name}</strong>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-teal-500/80 flex items-center justify-center font-bold text-teal-400 text-base shadow uppercase">
              {techProfile.name[0] || 'T'}
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
                onSave={handleCreateIntervention} 
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
