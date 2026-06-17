/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TechProfile } from "../types";
import { EmployeeDirectory } from "./EmployeeDirectory";
import { 
  User, 
  Award, 
  Building, 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  CheckCircle,
  AlertTriangle,
  FolderSync,
  FolderOpen,
  Sun,
  Moon
} from "lucide-react";

interface SettingsProfileProps {
  techProfile: TechProfile;
  onSaveProfile: (profile: TechProfile) => void;
  onExportData: () => void;
  onExportCSV: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFactory: () => void;
  onClearData: () => void;
  localDirName: string;
  onConnectDirectory: () => void;
  onDisconnectDirectory: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: (theme: "light" | "dark") => void;
}

export default function SettingsProfile({
  techProfile,
  onSaveProfile,
  onExportData,
  onExportCSV,
  onImportData,
  onResetFactory,
  onClearData,
  localDirName,
  onConnectDirectory,
  onDisconnectDirectory,
  theme = "light",
  onToggleTheme
}: SettingsProfileProps) {
  const [name, setName] = useState(techProfile.name);
  const [title, setTitle] = useState(techProfile.title);
  const [department, setDepartment] = useState(techProfile.department);
  const [centerName, setCenterName] = useState(techProfile.centerName);
  const [isSaved, setIsSaved] = useState(false);

  const isDark = theme === "dark";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      name: name.trim() || "Technicien Informatique",
      title: title.trim() || "Ingénieur Support CNIPLC",
      department: department.trim() || "Systèmes d'Information (DSI)",
      centerName: centerName.trim() || "CNIPLC"
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Profile Form & Theme Settings Column */}
      <div className="space-y-6">
        <div className={`border rounded-xl p-6 shadow-sm transition-colors duration-200 ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200/80 text-slate-900"
        }`}>
          <h3 className={`text-base font-bold border-b pb-3 mb-5 flex items-center gap-2 ${
            isDark ? "border-slate-800 text-slate-100" : "border-slate-100 text-slate-900"
          }`}>
            <User className="w-5 h-5 text-teal-600" />
            Votre Profil Professionnel (Intervenant)
          </h3>
          
          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            Saisissez vos identifiants ci-dessous. Ils seront automatiquement injectés en tant que signataire "L'intervenant technique" sur chaque attestation imprimable afin d'automatiser vos rédactions administratives.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}>
                Nom complet du Technicien IT *
              </label>
              <input
                id="settings-tech-name"
                type="text"
                required
                placeholder="ex: Said Awaleh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
            </div>

            {/* Job Title */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}>
                Grade / Fonction officielle *
              </label>
              <input
                id="settings-tech-title"
                type="text"
                required
                placeholder="ex: Ingénieur Support TI et Maintenance Informatique"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}>
                  Département d'Intégration
                </label>
                <input
                  id="settings-tech-dept"
                  type="text"
                  placeholder="ex: Infrastructure & Systèmes"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              {/* Public Center Name */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}>
                  Centre National (Logo / Titre)
                </label>
                <input
                  id="settings-center-name"
                  type="text"
                  placeholder="ex: CNIPLC"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              {isSaved && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Profil enregistré avec succès !
                </span>
              )}
              <button
                id="btn-settings-save"
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 active:bg-teal-850 text-white rounded-lg px-5 py-2.5 text-xs font-bold font-sans cursor-pointer transition-colors flex items-center gap-1.5 ml-auto"
              >
                Sauvegarder les Paramètres
              </button>
            </div>
          </form>
        </div>

        {/* Server Room Theme Selector */}
        <div className={`border rounded-xl p-5 shadow-sm transition-colors duration-200 ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200/80 text-slate-900"
        }`}>
          <h3 className={`text-sm font-bold border-b pb-2.5 mb-3 flex items-center justify-between ${
            isDark ? "border-slate-800" : "border-slate-100"
          }`}>
            <span className="flex items-center gap-1.5">
              {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              Ambiance d'Éclairage (Salle Serveur)
            </span>
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-slate-400">
              Vigilance de Nuit
            </span>
          </h3>

          <p className="text-[11px] text-slate-500 leading-normal mb-4">
            Basculez l'application en mode sombre d'État pour reposer vos yeux lors de vos gardes nocturnes ou pour vos interventions directes en armoires de baies réseau de salle serveur.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="theme-btn-light"
              type="button"
              onClick={() => onToggleTheme && onToggleTheme("light")}
              className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                !isDark 
                  ? "bg-amber-50/60 border-amber-300 text-amber-900" 
                  : "bg-slate-950/45 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              Clair Administration
            </button>

            <button
              id="theme-btn-dark"
              type="button"
              onClick={() => onToggleTheme && onToggleTheme("dark")}
              className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isDark 
                  ? "bg-indigo-950/40 border-indigo-550/40 text-indigo-300 shadow-sm" 
                  : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              Sombre Salle Serveur
            </button>
          </div>
        </div>
      </div>

      {/* Database control, Backups and local archives */}
      <div className={`border rounded-xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-200 ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200/80 text-slate-900"
      }`}>
        <div className="space-y-4">
          <h3 className={`text-base font-bold border-b pb-3 mb-1 flex items-center gap-2 ${
            isDark ? "border-slate-800" : "border-slate-100"
          }`}>
            <Database className="w-5 h-5 text-indigo-500" />
            Gestion des Fichiers Accomplis & Sauvegardes
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed text-justify">
            En tant que fonctionnaire d'État, vous devez garantir la sécurité et la traçabilité de vos dossiers de support. Vous pouvez exporter l'intégralité de vos archives dans un fichier de sauvegarde officiel local ou réimporter des registres précédents.
          </p>

          {/* Direct Local Disk Archiving Folder Setup Container */}
          <div className={`border rounded-xl p-4.5 space-y-3 transition-colors ${
            isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200/60"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-teal-600" />
                Dossier de Sauvegarde Directe PC
              </span>
              {localDirName ? (
                <span className="text-[10px] font-bold font-mono text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded flex items-center gap-1 border border-teal-550/20">
                  <CheckCircle className="w-3 h-3 text-teal-500" /> ACTIF
                </span>
              ) : (
                <span className="text-[10px] font-bold font-mono text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                  NON CONFIGURÉ
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-550 leading-normal">
              Spécifiez vers quel dossier physique de votre PC (ex: Bureau, clé USB, Documents) l'application doit stocker automatiquement vos fiches au format JSON à chaque clic sur <strong>"Valider et enregistrer"</strong>.
            </p>

            {localDirName ? (
              <div className={`flex items-center justify-between border rounded-lg p-2.5 ${
                isDark ? "bg-slate-900 border-slate-805" : "bg-white border-slate-150"
              }`}>
                <div className="text-xs font-semibold overflow-hidden text-ellipsis flex items-center gap-1.5 shrink-1">
                  <span className="inline-block w-2.5 h-2.5 bg-teal-500 rounded-full"></span>
                  <span className="truncate">Dossier : {localDirName}</span>
                </div>
                <button
                  id="btn-disconnect-directory"
                  onClick={onDisconnectDirectory}
                  className="text-[10px] font-bold text-red-500 hover:text-red-400 hover:bg-red-950/10 px-2.5 py-1.5 rounded border border-red-900/40 transition-colors cursor-pointer shrink-0"
                >
                  Déconnecter
                </button>
              </div>
            ) : (
              <button
                id="btn-connect-directory"
                onClick={onConnectDirectory}
                className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-850 text-white rounded-lg py-2.5 text-xs font-bold font-sans cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-teal-100" />
                Définir le Dossier de Sauvegarde d'État
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Export backup JSON */}
            <button
              id="btn-export-backup"
              onClick={onExportData}
              className={`px-2 py-3.5 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-1.5 ${
                isDark 
                  ? "border-slate-800 hover:border-teal-550/35 bg-slate-950 hover:bg-teal-950/25 text-slate-300 hover:text-teal-400" 
                  : "border-slate-200 hover:border-teal-200 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800"
              }`}
            >
              <Download className="w-5 h-5 text-teal-600" />
              <div>
                <span className="block text-xs font-bold font-sans">Exporter JSON</span>
                <span className="text-[8px] text-slate-400 block font-mono">Archive Officielle</span>
              </div>
            </button>

            {/* Export CSV */}
            <button
              id="btn-export-csv"
              onClick={onExportCSV}
              className={`px-2 py-3.5 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-1.5 ${
                isDark 
                  ? "border-slate-800 hover:border-emerald-550/35 bg-slate-950 hover:bg-emerald-950/25 text-slate-300 hover:text-emerald-400" 
                  : "border-slate-200 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800"
              }`}
            >
              <FileText className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="block text-xs font-bold font-sans">Exporter CSV</span>
                <span className="text-[8px] text-slate-400 block font-mono">Format Excel</span>
              </div>
            </button>

            {/* Import backup button triggers */}
            <label className={`px-2 py-3.5 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-1.5 ${
              isDark 
                ? "border-slate-800 hover:border-indigo-550/35 bg-slate-950 hover:bg-indigo-950/25 text-slate-300 hover:text-indigo-400" 
                : "border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800"
            }`}>
              <Upload className="w-5 h-5 text-indigo-600 animate-pulse" />
              <div>
                <span className="block text-xs font-bold font-sans">Importer (.JSON)</span>
                <span className="text-[8px] text-slate-400 block font-mono font-bold">Restaurer</span>
              </div>
              <input
                id="input-file-backup"
                type="file"
                accept=".json"
                onChange={onImportData}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Severe database resets */}
        <div className={`pt-5 border-t flex flex-col gap-3 mt-4 ${
          isDark ? "border-slate-800" : "border-slate-100"
        }`}>
          <div className={`flex items-start gap-2 border rounded-lg p-3 text-xs leading-normal ${
            isDark ? "bg-amber-950/20 border-amber-900/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Attention Administrative:</strong> La réinitialisation vide l'historique complet et réinjecte l'échantillon d'exemples officiels pour tester la validité du tableau de bord.
            </span>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              id="btn-settings-clear"
              type="button"
              onClick={() => {
                if (confirm("Confirmez-vous la purge complète du registre d'interventions ? Cette action supprimera TOUT.")) {
                  onClearData();
                }
              }}
              className="text-[10px] font-bold text-red-500 hover:bg-red-950/10 hover:text-red-400 border border-red-900/40 px-3 py-2 rounded-lg cursor-pointer transition-colors"
            >
              Purger le Registre
            </button>
            
            <button
              id="btn-settings-reset"
              type="button"
              onClick={() => {
                if (confirm("Réinjecter les exemples d'interventions administratifs (Said Awaleh) ? Vos données en cours seront remplacées.")) {
                  onResetFactory();
                }
              }}
              className={`text-[10px] font-bold px-3 py-2 border rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                isDark ? "text-slate-300 hover:bg-slate-800 border-slate-800" : "text-slate-600 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <FolderSync className="w-3.5 h-3.5" />
              Réinjecter Exemples
            </button>
          </div>
        </div>
        
      </div>

      </div>
      
      {/* Employee Directory Section */}
      <EmployeeDirectory theme={theme} />
    </div>
  );
}
