/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Intervention, TechProfile, TaskItem, DevicePhoto } from "../types";
import { DEPARTMENTS, DEVICE_TYPES, TASK_CATEGORIES } from "../data/constants";
import { Sparkles, Plus, Trash2, Save, AlertTriangle, UploadCloud, Camera, X, Mic, MicOff } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import PhotoCollage from "./PhotoCollage";
import { Employee, fetchEmployees } from "../lib/supabase";

interface NewInterventionFormProps {
  onSave: (intervention: Omit<Intervention, "id" | "refNumber" | "created_at">) => void;
  techProfile: TechProfile | null;
  theme?: "light" | "dark";
  interventions: Intervention[];
}

export default function NewInterventionForm({ 
  onSave, 
  techProfile, 
  theme = "light",
  interventions = []
}: NewInterventionFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  React.useEffect(() => {
    fetchEmployees().then(setEmployees);
  }, []);

  const [clientName, setClientName] = useState("");
  const [clientTitle, setClientTitle] = useState("");
  const [clientDepartment, setClientDepartment] = useState(DEPARTMENTS[0]);
  const [quickNotes, setQuickNotes] = useState("");
  
  // Multi-beneficiary batch logging states
  const [isMultiBeneficiary, setIsMultiBeneficiary] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<{ name: string; title: string; department: string }[]>([]);
  
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0].value);
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceInventory, setDeviceInventory] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));

  const [rawNotes, setRawNotes] = useState("");
  const [professionalSummary, setProfessionalSummary] = useState("");
  const [tasks, setTasks] = useState<Omit<TaskItem, "id">[]>([]);
  const [status, setStatus] = useState<"termine" | "en_cours">("termine");
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files) as File[];
    const currentLen = photos.length;
    const availableSlots = 6 - currentLen;
    const filesToProcess = filesArray.slice(0, availableSlots);

    if (filesArray.length > availableSlots) {
      alert("Limite dépassée : Vous pouvez ajouter un maximum de 6 photos d'intervention pour conserver un rapport de qualité administrative sur une seule page.");
    }

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: base64String,
            taskDescription: "", // filled manually by the user
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePhotoDescChange = (id: string, text: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, taskDescription: text } : p))
    );
  };

  // Manual subtask field helpers
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskCat, setNewTaskCat] = useState<TaskItem["category"]>("Matériel");

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // States for Voice Dictation
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [dictationLang, setDictationLang] = useState("fr-FR");
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  const startVoiceDictation = () => {
    setVoiceError("");
    setVoiceTranscript("");
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("La dictée vocale n'est pas supportée sur ce navigateur. Veuillez utiliser Google Chrome, Microsoft Edge ou Safari.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = dictationLang;

      rec.onstart = () => {
        setIsVoiceRecording(true);
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setVoiceTranscript(finalTranscript || interimTranscript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setVoiceError("L'accès au microphone a été refusé. Veuillez autoriser le microphone dans les permissions de votre navigateur.");
        } else {
          setVoiceError(`Erreur du microphone : ${event.error}`);
        }
        setIsVoiceRecording(false);
      };

      rec.onend = () => {
        setIsVoiceRecording(false);
      };

      setRecognitionObj(rec);
      rec.start();
    } catch (err: any) {
      console.error(err);
      setVoiceError(`Impossible de démarrer le microphone: ${err.message || err}`);
    }
  };

  const stopVoiceDictation = (autoProcess = true) => {
    if (recognitionObj) {
      try {
        recognitionObj.stop();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
    }
    setIsVoiceRecording(false);
    
    if (autoProcess) {
      // Trigger parsing with a tiny timeout to let states flush final speech segments
      setTimeout(() => {
        setVoiceTranscript(currentTranscript => {
          if (currentTranscript.trim()) {
            processTranscript(currentTranscript);
          }
          return currentTranscript;
        });
      }, 300);
    }
  };

  const processTranscript = async (textToProcess: string) => {
    const transcriptText = textToProcess.trim();
    if (!transcriptText) {
      setVoiceError("Aucun texte n'a été transcrit ou détecté.");
      return;
    }

    setVoiceError("");
    setIsVoiceProcessing(true);

    try {
      let data: any = null;

      try {
        const response = await fetch("/api/parse-voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ transcript: transcriptText })
        });

        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error("Impossible de joindre le service Express de dictée.");
        }
      } catch (backendErr) {
        console.warn("[Vercel/Local Fallback Voice] Saisie vocale via clé d'API cliente...", backendErr);
        
        const clientApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (window as any).VITE_GEMINI_API_KEY;
        if (clientApiKey) {
          const isNvidia = clientApiKey.startsWith("nvapi-");
          if (isNvidia) {
            const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${clientApiKey}`
              },
              body: JSON.stringify({
                model: "meta/llama-3.1-70b-instruct",
                messages: [
                  {
                    role: "system",
                    content: 
                      "Vous êtes un assistant IA de saisie d'intervention d'élite rattaché au CNIPLC (Republique de Djibouti). " +
                      "Votre rôle est d'analyser la transcription vocale d'une intervention et d'extraire toutes les informations demandées sous forme de JSON strict. " +
                      "Vous devez renvoyer un objet JSON contenant exactement ces clés :\n" +
                      "1. 'clientName': le nom complet du bénéficiaire de l'intervention (ex: 'M. Ammad').\n" +
                      "2. 'clientTitle': sa fonction administrative (ex: 'Chef de service').\n" +
                      "3. 'clientDepartment': son département ou service.\n" +
                      "4. 'deviceType': le type d'appareil (ex: 'PC Portable', 'PC de Bureau').\n" +
                      "5. 'deviceBrand': la marque/modèle de l'appareil (ex: 'Dell', 'HP').\n" +
                      "6. 'date': la date de l'intervention au format strict 'YYYY-MM-DD'. Déterminez la date d'après le texte (ex: 'Thursday, December 21st, 2021' -> '2021-12-21'). S'il n'y a pas de date ou de détails précis, considérez la date : '2026-06-15'.\n" +
                      "7. 'rawNotes': le compte rendu technique brute écrit rapidement.\n" +
                      "8. 'professionalSummary': un résumé officiel poli et rédigé (1 à 2 phrases) en français soutenu pour le livrable.\n" +
                      "9. 'tasks': un tableau d'objets contenant chacun 'description' et 'category' ('Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre')."
                  },
                  {
                    role: "user",
                    content: `Voici la transcription audio brute du technicien à l'analyse : "${transcriptText}"`
                  }
                ],
                temperature: 0.1,
                max_tokens: 1500,
                response_format: { type: "json_object" }
              })
            });

            if (!response.ok) {
              throw new Error(`Erreur API NVIDIA: ${response.status} ${response.statusText}`);
            }

            const nvData = await response.json();
            const contentText = nvData?.choices?.[0]?.message?.content;

            if (contentText) {
              let cleaned = contentText.trim();
              if (cleaned.startsWith("```")) {
                cleaned = cleaned.replace(/^```json/i, "").replace(/```$/s, "").trim();
              }
              data = JSON.parse(cleaned);
            }
          } else {
            const aiClient = new GoogleGenAI({ apiKey: clientApiKey });
            const aiResponse = await aiClient.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Analysez cette transcription audio d'intervention : "${transcriptText}" et transformez la en objet JSON structuré.`,
              config: {
                systemInstruction:
                  "Vous êtes un assistant IA de saisie d'intervention d'élite rattaché au CNIPLC (Republique de Djibouti). " +
                  "Votre rôle est d'analyser la transcription vocale d'une intervention et d'extraire toutes les informations demandées sous forme de JSON strict. " +
                  "Vous devez renvoyer un objet JSON contenant exactement ces clés :\n" +
                  "1. 'clientName': le nom complet du bénéficiaire (ex: 'M. Ammad').\n" +
                  "2. 'clientTitle': sa fonction administrative (ex: 'Chef de service').\n" +
                  "3. 'clientDepartment': son département ou service.\n" +
                  "4. 'deviceType': le type d'appareil (ex: 'PC Portable', 'PC de Bureau').\n" +
                  "5. 'deviceBrand': la marque/modèle de l'appareil (ex: 'Dell', 'HP').\n" +
                  "6. 'date': la date de l'intervention au format strict 'YYYY-MM-DD'. Déterminez la date d'après le texte (ex: 'Thursday, December 21st, 2021' -> '2021-12-21'). S'il n'y a pas de date ou de détails précis, considérez la date : '2026-06-15'.\n" +
                  "7. 'rawNotes': le compte rendu technique brute écrit rapidement.\n" +
                  "8. 'professionalSummary': un résumé officiel poli et rédigé (1 à 2 phrases) en français soutenu pour le livrable.\n" +
                  "9. 'tasks': un tableau d'objets contenant chacun 'description' et 'category' ('Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre').",
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    clientName: { type: Type.STRING },
                    clientTitle: { type: Type.STRING },
                    clientDepartment: { type: Type.STRING },
                    deviceType: { type: Type.STRING },
                    deviceBrand: { type: Type.STRING },
                    date: { type: Type.STRING },
                    rawNotes: { type: Type.STRING },
                    professionalSummary: { type: Type.STRING },
                    tasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          description: { type: Type.STRING },
                          category: { type: Type.STRING, enum: ["Matériel", "Logiciel", "Réseau", "Sécurité", "Optimisation", "Autre"] }
                        },
                        required: ["description", "category"]
                      }
                    }
                  },
                  required: ["clientName", "clientTitle", "clientDepartment", "deviceType", "deviceBrand", "date", "rawNotes", "professionalSummary", "tasks"]
                }
              }
            });

            if (aiResponse.text) {
              data = JSON.parse(aiResponse.text.trim());
            }
          }
        } else {
          throw new Error("Aucune clé API (Gemini/Nvidia) n'est configurée dans le navigateur.");
        }
      }

      if (data) {
        if (data.clientName) setClientName(data.clientName);
        if (data.clientTitle) setClientTitle(data.clientTitle);
        if (data.clientDepartment) setClientDepartment(data.clientDepartment);
        if (data.deviceType) setDeviceType(data.deviceType);
        if (data.deviceBrand) setDeviceBrand(data.deviceBrand);
        if (data.date) setDate(data.date);
        if (data.rawNotes) setRawNotes(data.rawNotes);
        if (data.professionalSummary) setProfessionalSummary(data.professionalSummary);
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks.map((t: any) => ({
            description: t.description,
            category: t.category,
            status: "completed"
          })));
        }
      }
    } catch (err: any) {
      console.error("Voice parse error:", err);
      setVoiceError(`Une erreur s'est produite lors du traitement automatique de votre voix : ${err.message || err}`);
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  // Department frequency for standard dropdowns
  const departmentFrequency: { [dept: string]: number } = {};

  interventions.forEach((item) => {
    const dept = item.clientDepartment?.trim();
    if (dept) {
      departmentFrequency[dept] = (departmentFrequency[dept] || 0) + 1;
    }
  });

  // Combined standard departments list + frequent custom input ones
  const displayedDepartments = Array.from(new Set([
    ...employees.map(c => c.department),
    ...Object.keys(departmentFrequency).sort((a, b) => departmentFrequency[b] - departmentFrequency[a]),
    ...DEPARTMENTS
  ])).filter(Boolean).slice(0, 20);

  const isDark = theme === "dark";

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setClientName(val);
    const found = employees.find(emp => emp.name === val);
    if (found) {
      setClientTitle(found.title);
      setClientDepartment(found.department);
    }
  };

  const handleAddBeneficiaryToList = () => {
    if (!clientName.trim()) {
      alert("Veuillez saisir le nom du bénéficiaire avant de l'ajouter.");
      return;
    }
    setBeneficiaries([
      ...beneficiaries,
      {
        name: clientName.trim(),
        title: clientTitle.trim() || "Collaborateur / Directeur",
        department: clientDepartment
      }
    ]);
    // Clear name and title for the next beneficiary
    setClientName("");
    setClientTitle("");
  };

  const handleRemoveBeneficiaryFromList = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const handleRefineWithIA = async () => {
    if (!rawNotes.trim()) {
      setAiError("Veuillez d'abord saisir vos notes d'intervention rapides/brutes ci-dessous.");
      return;
    }
    setAiError("");
    setIsAiLoading(true);

    try {
      let data: any = null;
      let response;

      try {
        response = await fetch("/api/refine-tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            rawNotes,
            deviceType,
            deviceBrand,
            clientName,
            clientTitle,
            clientDepartment
          })
        });

        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error("Impossible de joindre le service de reformulation administrative.");
        }
      } catch (backendErr) {
        console.warn("[Vercel/Local Fallback] Le serveur d'API Express n'est pas actif (normal sur Vercel sans serveur de production). Test d'une clé API côté client...", backendErr);
        
        // Retrieve key client side
        const clientApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (window as any).VITE_GEMINI_API_KEY;

        if (clientApiKey) {
          const isNvidia = clientApiKey.startsWith("nvapi-");
          if (isNvidia) {
            console.log("[Client Nvidia] Exécution directe côté navigateur via l'API NVIDIA NIM...");
            const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${clientApiKey}`
              },
              body: JSON.stringify({
                model: "meta/llama-3.1-70b-instruct",
                messages: [
                  {
                    role: "system",
                    content: 
                      "Vous êtes un assistant IA de rédaction administrative d'État d'élite rattaché au CNIPLC (Centre National d'Informatique) de la République de Djibouti. " +
                      "Votre rôle est d'aider les techniciens à reformuler leurs notes rapides en rapports d'intervention haut de gamme, rédigés dans un français officiel, clair, soutenu et rigoureux. " +
                      "Vous devez impérativement intégrer de façon naturelle l'ensemble des données du formulaire : l'appareil résolu, sa marque, le nom complet du bénéficiaire, son titre/fonction et son département ministériel d'affectation pour produire un texte sur-mesure. " +
                      "Vous devez obligatoirement renvoyer vos réponses au format JSON strict avec les clés de premier niveau suivantes :\n" +
                      "1. 'professionalSummary': un compte rendu global, rédigé, fluide et respectueux décrivant l'ensemble de la prestation de service fait en français administratif, mentionnant le bénéficiaire, son titre, son département, et l'atteinte de la réparation.\n" +
                      "2. 'tasks': une liste d'actes techniques précis (array d'objets) contenant chacun 'description' (le libellé de l'acte technique précis rédigé de façon professionnelle et détaillée, ex: 'Maintenance physique curative par démontage, dépoussiérage et remplacement de barrette mémoire active') " +
                      "et 'category' (obligatoirement l'un des choix suivants: 'Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre')."
                  },
                  {
                    role: "user",
                    content: `Équipement: ${deviceType || 'Ordinateur'} (${deviceBrand || 'Standard'})\nBénéficiaire d'État: ${clientName || 'Collaborateur'} - ${clientTitle || 'Fonctionnaire'} au sein du service : ${clientDepartment || 'Dossier Technique'}\nNotes brutes et rapides du technicien à formuler : "${rawNotes}"`
                  }
                ],
                temperature: 0.2,
                max_tokens: 1024,
                response_format: { type: "json_object" }
              })
            });

            if (!response.ok) {
              throw new Error(`Erreur API NVIDIA: ${response.status} ${response.statusText}`);
            }

            const nvData = await response.json();
            const contentText = nvData?.choices?.[0]?.message?.content;

            if (contentText) {
              let cleaned = contentText.trim();
              if (cleaned.startsWith("```")) {
                cleaned = cleaned.replace(/^```json/i, "").replace(/```$/s, "").trim();
              }
              data = JSON.parse(cleaned);
            } else {
              throw new Error("L'API NVIDIA NIM côté navigateur n'a retourné aucun contenu.");
            }
          } else {
            console.log("[Client Gemini] Exécution directe côté navigateur via le SDK GoogleGenAI...");
            const aiClient = new GoogleGenAI({ apiKey: clientApiKey });
            const prompt = `Notes brutes du technicien: "${rawNotes}"\nÉquipement concerné: ${deviceType || 'PC'} (Marque: ${deviceBrand || 'Standard'})\nBénéficiaire: ${clientName || 'Collaborateur'} (${clientTitle || 'Fonctionnaire'})\nSecteur/Département: ${clientDepartment || 'Dossier Technique'}\n\nFormulez ceci de manière extrêmement professionnelle en insérant intelligemment et formellement ces informations dans un style d'attestation administrative officielle d'État de style République de Djibouti.`;

            const aiResponse = await aiClient.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              config: {
                systemInstruction: 
                  "Vous êtes un expert IA des rédactions techniques et administratives de haut niveau pour l'État, rattaché au CNIPLC (Centre National d'Informatique) de la République de Djibouti. " +
                  "Votre mission est d'aider les techniciens à transformer leurs notes d'intervention rapides (ex: 'depan pc ram qui rame') en rapports techniques d'intervention " +
                  "hautement professionnels, rédigés en français officiel, élégant, soutenu et précis. " +
                  "Intégrez intelligemment le bénéficiaire, sa fonction officielle, son direction/département, ainsi que le matériel et sa marque dans un compte rendu global parfait. " +
                  "Séparez l'intervention en une synthèse globale formelle personnalisée ('professionalSummary') " +
                  "et une série d'actions techniques atomiques ('tasks') catégorisées.",
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    professionalSummary: {
                      type: Type.STRING,
                      description: "Une synthèse rédigée polie et hautement professionnelle décrivant l'ensemble de l'opération en français de style officiel en intégrant le bénéficiaire, sa fonction, son département, le matériel résolu et la résolution positive de la panne."
                    },
                    tasks: {
                      type: Type.ARRAY,
                      description: "La décomposition des actions de maintenance et d'assistance concrètes réalisées.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          description: {
                            type: Type.STRING,
                            description: "Une phrase courte et claire décrivant l'action précise réalisée (ex: 'Démontage interne, dépollution mécanique des composants et mise à niveau de la RAM DDR4 8Go')."
                          },
                          category: {
                            type: Type.STRING,
                            enum: ["Matériel", "Logiciel", "Réseau", "Sécurité", "Optimisation", "Autre"],
                            description: "La classification de l'action technique."
                          }
                        },
                        required: ["description", "category"]
                      }
                    }
                  },
                  required: ["professionalSummary", "tasks"]
                }
              }
            });

            if (aiResponse.text) {
              data = JSON.parse(aiResponse.text.trim());
            } else {
              throw new Error("L'API Gemini côté navigateur n'a retourné aucun contenu.");
            }
          }
        } else {
          // Both server is unavailable AND VITE_GEMINI_API_KEY is not defined in Vercel.
          throw new Error("Vercel_No_API_Key");
        }
      }
      
      if (data && data.professionalSummary) {
        setProfessionalSummary(data.professionalSummary);
      }
      
      if (data && data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks.map((t: any) => ({
          description: t.description,
          category: t.category,
          status: "completed"
        })));
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "Vercel_No_API_Key") {
        setAiError("Déploiement Vercel : Le serveur d'API Express local de l'application (qui gère l'orchestration NVIDIA Llama et Gemini) n'est pas actif dans votre navigateur (normal en hébergement statique SPA sur Vercel). Pour activer la reformulation intelligente directe d'intervention, ajoutez simplement le paramètre d'environnement VITE_GEMINI_API_KEY avec votre clé d'API NVIDIA (commençant par 'nvapi-') ou votre clé d'API Google Gemini dans les paramètres de votre projet sur le tableau de bord Vercel !");
      } else {
        setAiError("Le service IA du CNIPLC n'a pas pu traiter ce texte. Une reformulation générique a été appliquée.");
      }
      
      // Local fallback
      setProfessionalSummary(`Intervention technique sur l'appareil ${deviceBrand || ''} ${deviceType}. Travaux effectués conformément aux notes du technicien : ${rawNotes}.`);
      setTasks([
        { description: `Diagnostic et maintenance : ${rawNotes}`, category: "Autre", status: "completed" }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddTask = () => {
    if (!newTaskDesc.trim()) return;
    setTasks([
      ...tasks,
      {
        description: newTaskDesc.trim(),
        category: newTaskCat,
        status: "completed"
      }
    ]);
    setNewTaskDesc("");
  };

  const handleRemoveTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let beneficiaryList = [];
    if (isMultiBeneficiary) {
      if (beneficiaries.length === 0) {
        alert("Veuillez ajouter au moins un bénéficiaire à la liste.");
        return;
      }
      beneficiaryList = [...beneficiaries];
    } else {
      if (!clientName.trim()) {
        alert("Veuillez spécifier le nom du demandeur (Bénéficiaire).");
        return;
      }
      beneficiaryList = [{
        name: clientName.trim(),
        title: clientTitle.trim() || "Collaborateur / Directeur",
        department: clientDepartment
      }];
    }

    // Default professional summary if empty
    const actualSummary = professionalSummary.trim() || `Intervention de maintenance corrective. ${rawNotes}`;
    const actualTasksParams = tasks.length > 0 ? tasks : [
      { description: rawNotes || "Prestation d'assistance informatique standard", category: "Autre" as const, status: "completed" as const }
    ];

    // Save for each beneficiary
    beneficiaryList.forEach((ben, index) => {
      onSave({
        date,
        clientName: ben.name,
        clientTitle: ben.title,
        clientDepartment: ben.department,
        techName: techProfile?.name || "Technicien Informatique",
        techTitle: techProfile?.title || "Support CNIPLC",
        deviceType,
        deviceBrand: deviceBrand.trim() || "Standard",
        deviceInventory: deviceInventory.trim() || "N/A",
        rawNotes: rawNotes.trim(),
        quickNotes: quickNotes.trim(),
        professionalSummary: actualSummary,
        tasks: actualTasksParams.map((t, idx) => ({
          ...t,
          id: `task-${Date.now()}-${index}-${idx}`
        })),
        status,
        durationMinutes,
        photos,
        signatureDate: status === "termine" ? date : undefined
      });
    });

    // Reset Form
    setClientName("");
    setClientTitle("");
    setDeviceBrand("");
    setDeviceInventory("");
    setRawNotes("");
    setQuickNotes("");
    setProfessionalSummary("");
    setTasks([]);
    setPhotos([]);
    setBeneficiaries([]);
  };

  return (
    <form id="new-intervention-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Dynamic Voice Recording Assist Card */}
      <div className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
        isVoiceRecording 
          ? "border-red-500 bg-red-50/10 shadow-md shadow-red-500/5 animate-pulse" 
          : isVoiceProcessing 
            ? "border-teal-500 bg-teal-50/5 shadow-md shadow-teal-500/5 animate-pulse"
            : isDark 
              ? "border-slate-800 bg-slate-900/60 hover:border-slate-700" 
              : "border-slate-200 bg-slate-50/80 hover:border-slate-350"
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-500 animate-bounce" />
              <span>Assistance Vocale Magique (CNIPLC Voice-to-File)</span>
            </h4>
            <p className="text-xs text-slate-550 leading-normal max-w-xl">
              Parlez librement pour décrire votre intervention. Notre I.A. extraira automatiquement l'ensemble des champs (nom, fonction, département ministériel, type de matériel, date, et tâches effectuées) pour pré-remplir le rapport instantanément !
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Langue de dictée</span>
              <select
                value={dictationLang}
                onChange={(e) => setDictationLang(e.target.value)}
                className={`text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                  isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
                disabled={isVoiceRecording || isVoiceProcessing}
              >
                <option value="fr-FR">Français (fr-FR)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>

            {isVoiceRecording ? (
              <button
                type="button"
                onClick={() => stopVoiceDictation(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span>Arrêter & Analyser</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceDictation}
                disabled={isVoiceProcessing}
                className={`flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer`}
              >
                <Mic className="w-4 h-4" />
                <span>Commencer la dictée</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time speech result container */}
        {isVoiceRecording && (
          <div className={`mt-4 p-3 rounded-lg border text-sm font-mono flex items-start gap-3 ${
            isDark ? "bg-slate-950 border-slate-800 text-teal-400" : "bg-slate-100 border-slate-200 text-teal-850"
          }`}>
            <div className="flex h-2 w-2 bg-teal-500 rounded-full animate-ping mt-1.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Transcription en temps réel :</span>
              <p className="italic">{voiceTranscript || "Parlez maintenant, nous vous écoutons..."}</p>
            </div>
          </div>
        )}

        {isVoiceProcessing && (
          <div className={`mt-4 p-3 rounded-lg border text-sm font-mono flex items-start gap-3 ${
            isDark ? "bg-slate-950 border-teal-950 text-teal-400" : "bg-teal-50 border-teal-100 text-teal-850"
          }`}>
            <svg className="animate-spin h-4 w-4 text-teal-500 mt-1 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="space-y-1">
              <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">Analyse par l'I.A. CNIPLC :</span>
              <p className="italic">Traitement de l'enregistrement de votre voix en cours... Remplissage automatique des champs...</p>
            </div>
          </div>
        )}

        {voiceError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

        {!isVoiceRecording && !isVoiceProcessing && voiceTranscript && !voiceError && (
          <div className={`mt-4 p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
            isDark ? "bg-slate-950/40 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dernier enregistrement audio traité :</span>
              <p className="italic">"{voiceTranscript}"</p>
            </div>
            <button
              type="button"
              onClick={() => processTranscript(voiceTranscript)}
              className="text-[10px] font-bold text-teal-500 hover:text-teal-600 uppercase cursor-pointer tracking-wider whitespace-nowrap shrink-0 border border-teal-500/20 rounded px-1.5 py-0.5 hover:bg-teal-500/5 transition-colors"
            >
              Réanalyser
            </button>
          </div>
        )}
      </div>

      <div className={`border shadow-sm rounded-xl p-6 transition-colors duration-200 ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200/80 text-slate-900"
      }`}>
        <h3 className={`text-base font-bold border-b pb-3 mb-5 flex items-center justify-between ${
          isDark ? "border-slate-800 text-slate-100" : "border-slate-100 text-slate-900"
        }`}>
          <span>1. Informations Générales & Bénéficiaire</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            isDark ? "bg-teal-950/40 text-teal-400 border border-teal-500/20" : "bg-teal-50 text-teal-700"
          }`}>
            Intervenant actif : {techProfile?.name || "Non Défini"}
          </span>
        </h3>

        {/* Multi-Beneficiary Toggle */}
        <div className={`flex items-center justify-between rounded-lg px-4 py-3 mb-5 border transition-all duration-300 ${
          isMultiBeneficiary
            ? isDark ? "bg-gradient-to-r from-amber-950/40 to-orange-950/30 border-amber-500/30" : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
            : isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
              isMultiBeneficiary
                ? "bg-amber-500/20 text-amber-500"
                : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-500"
            }`}>
              👥
            </div>
            <div>
              <p className="text-sm font-bold">{isMultiBeneficiary ? "Mode Multi-Bénéficiaires Activé ⚡" : "Saisie Individuelle"}</p>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {isMultiBeneficiary
                  ? "Ajoutez plusieurs bénéficiaires, ils partageront la même intervention."
                  : "Activer le mode multi pour consigner la même tâche pour plusieurs personnes."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setIsMultiBeneficiary(!isMultiBeneficiary); setBeneficiaries([]); }}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
              isMultiBeneficiary ? "bg-amber-500" : isDark ? "bg-slate-700" : "bg-slate-300"
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
              isMultiBeneficiary ? "translate-x-6" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {/* Multi-Beneficiary List Cards */}
        {isMultiBeneficiary && beneficiaries.length > 0 && (
          <div className="mb-5 space-y-2">
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-amber-400" : "text-amber-700"}`}>
              {beneficiaries.length} bénéficiaire{beneficiaries.length > 1 ? "s" : ""} ajouté{beneficiaries.length > 1 ? "s" : ""} à cette intervention :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {beneficiaries.map((ben, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 border transition-all duration-200 group ${
                    isDark
                      ? "bg-slate-950/60 border-slate-800 hover:border-amber-500/40"
                      : "bg-white border-slate-200 hover:border-amber-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                    }`}>
                      {ben.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{ben.name}</p>
                      <p className={`text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {ben.title} — {ben.department}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBeneficiaryFromList(idx)}
                    className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    title="Retirer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Client Name */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              {isMultiBeneficiary ? "Nom du prochain bénéficiaire" : "Nom complet du Bénéficiaire *"}
            </label>
            <div className="flex gap-2">
              <input
                id="input-client-name"
                type="text"
                required={!isMultiBeneficiary}
                placeholder="Sélectionner ou saisir..."
                value={clientName}
                onChange={handleClientNameChange}
                list="employees-list"
                className={`flex-1 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-650" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
              {isMultiBeneficiary && (
                <button
                  type="button"
                  onClick={handleAddBeneficiaryToList}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                  title="Ajouter ce bénéficiaire à la liste"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              )}
            </div>
            <datalist id="employees-list">
              {employees.map((emp) => (
                <option key={emp.id || emp.name} value={emp.name}>
                  {emp.title ? `${emp.title} - ` : ""}{emp.department}
                </option>
              ))}
            </datalist>
          </div>

          {/* Client Title */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              Titre / Fonction officielle
            </label>
            <input
              id="input-client-title"
              type="text"
              placeholder="ex: Directeur des Ressources Humaines"
              value={clientTitle}
              onChange={(e) => setClientTitle(e.target.value)}
              className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-650" : "bg-white border-slate-200 text-slate-800"
              }`}
            />
          </div>

          {/* Client Department */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              Département / Direction d'État
            </label>
            <input
              id="input-client-dept"
              type="text"
              placeholder="ex: Cabinet du Directeur, Ressources Humaines..."
              value={clientDepartment}
              onChange={(e) => setClientDepartment(e.target.value)}
              list="departments-list"
              className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-650" : "bg-white border-slate-200 text-slate-800"
              }`}
            />
            <datalist id="departments-list">
              {displayedDepartments.map((dept) => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          {/* Equipment Type */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              Type de Matériel
            </label>
            <input
              id="input-device-type"
              type="text"
              placeholder="ex: PC Portable, Imprimante, Switch..."
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              list="device-types-list"
              className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-650" : "bg-white border-slate-200 text-slate-800"
              }`}
            />
            <datalist id="device-types-list">
              {DEVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value} />
              ))}
            </datalist>
          </div>

          {/* Device Brand */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              Modèle / Marque
            </label>
            <input
              id="input-device-brand"
              type="text"
              placeholder="ex: HP LaserJet M404 / Dell Vostro"
              value={deviceBrand}
              onChange={(e) => setDeviceBrand(e.target.value)}
              className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-650" : "bg-white border-slate-200 text-slate-800"
              }`}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              Date d'intervention
            </label>
            <input
              id="input-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-950" : "bg-white border-slate-200 text-slate-805"
              }`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 2: Informational / Notes */}
        <div className={`border shadow-sm rounded-xl p-6 flex flex-col justify-between transition-colors duration-200 ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200/80 text-custom-gray"
        }`}>
          <div className="space-y-4">
            <h3 className={`text-base font-bold border-b pb-3 mb-1 flex items-center justify-between ${
              isDark ? "border-slate-800 text-slate-100" : "border-slate-105 text-slate-900"
            }`}>
              <span>2. Saisie Rapide des Notes de Prestation</span>
              <span className="text-xs font-bold text-slate-400 font-mono">Notes brutes</span>
            </h3>

            <p className="text-xs text-slate-500 leading-normal">
              Écrivez ici vos notes de travail comme vous le feriez à la volée durant le dépannage informatique. Notre moteur d'IA administrative formulera un rapport de haut niveau à présenter au Directeur.
            </p>

            <div className="space-y-2">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}>
                Vos notes brutes (Que s'est-il passé, qu'avez-vous résolu ?) *
              </label>
              <textarea
                id="textarea-raw-notes"
                rows={4}
                required
                placeholder="Rédigez succinctement (ex: depan pc ram lent, ajouter 8go ddr4 dell, suppression adware malware, depoussierage complet)"
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                className={`w-full text-sm p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-655" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}>
                Notes rapides / Observations complémentaires (Optionnel)
              </label>
              <textarea
                id="textarea-quick-notes"
                rows={2}
                placeholder="Détails contextuels ou observations de maintenance non structurées (ex: écran un peu rayé, câblage nettoyé, onduleur fatigué)"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className={`w-full text-sm p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-655" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
              <p className="text-[10px] text-slate-450">
                Ces observations de maintenance ne sont pas traitées par l'IA mais seront consignées directement sur la fiche d'intervention.
              </p>
            </div>

            {aiError && (
              <div className={`border p-3 rounded-lg flex items-start gap-2 text-xs ${
                isDark ? "bg-amber-955/20 border-amber-900/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <AlertTriangle className="w-4 h-4 text-amber-653 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          <div className={`mt-6 pt-4 border-t flex gap-3 ${
            isDark ? "border-slate-800" : "border-slate-105"
          }`}>
            <button
              id="btn-refine-ia"
              type="button"
              disabled={isAiLoading || !rawNotes.trim()}
              onClick={handleRefineWithIA}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isAiLoading 
                  ? "bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed"
                  : !rawNotes.trim()
                  ? isDark
                    ? "bg-slate-950 text-slate-600 border border-slate-850 cursor-not-allowed"
                    : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
                  : isDark
                    ? "bg-teal-950/40 hover:bg-teal-900/40 text-teal-300 border border-teal-800/60"
                    : "bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-850 border border-teal-200/50"
              }`}
            >
              <Sparkles className={`w-4 h-4 text-teal-605 ${isAiLoading ? "animate-spin" : ""}`} />
              {isAiLoading ? "Traitement par l'IA CNIPLC..." : "Générer les termes professionnels par IA"}
            </button>
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-500 font-mono">DURÉE (MINUTES) :</div>
              <input
                id="input-duration-min"
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                className={`w-16 text-center text-sm font-mono font-bold px-2 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? "bg-slate-950 border-slate-800 text-teal-400" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
            </div>
          </div>
        </div>

        <div className={`border shadow-sm rounded-xl p-6 transition-colors duration-200 mt-6 ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200/80 text-slate-900"
        }`}>
          <h3 className={`text-base font-bold border-b pb-3 mb-4 flex items-center justify-between ${
            isDark ? "border-slate-800 text-slate-100" : "border-slate-100 text-slate-900"
          }`}>
            <span className="flex items-center gap-1.5 font-sans">
              <Camera className="w-4.5 h-4.5 text-teal-500" />
              <span>4. Photos des Équipements et Preuves de Prestation</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Max 6 photos</span>
          </h3>

          <p className="text-xs text-slate-500 leading-normal mb-4">
            Importez des clichés des pannes constatées ou des opérations effectuées. L'application générera automatiquement un collage professionnel adapté sur la fiche d'intervention imprimée.
          </p>

          <input
            id="images-collages-uploader"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => document.getElementById("images-collages-uploader")?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 group ${
              isDark 
                ? "border-slate-800 hover:border-teal-500/50 bg-slate-950/20 hover:bg-slate-950/40" 
                : "border-slate-200 hover:border-teal-500 bg-slate-50/50 hover:bg-teal-550/20"
            }`}
          >
            <UploadCloud className={`w-10 h-10 transition-transform group-hover:scale-105 ${
              isDark ? "text-slate-600 group-hover:text-teal-400" : "text-slate-400 group-hover:text-teal-500"
            }`} />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-605">Importer ou Déposer des images</span>
            <span className="text-[10px] text-slate-400">Glissez-déposez jusqu'à 6 photos des équipements</span>
          </div>

          {photos.length > 0 && (
            <div className="space-y-4 mt-6">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">Descriptif des actes accomplis pour chaque image :</h4>
              <div className="space-y-3">
                {photos.map((photo, idx) => (
                  <div 
                    key={photo.id}
                    className={`flex gap-3 p-2.5 rounded-lg border items-center transition-all ${
                      isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/40 border-slate-100"
                    }`}
                  >
                    <div className="w-12 h-12 rounded overflow-hidden relative group shrink-0 border border-slate-350 dark:border-slate-850">
                      <img 
                        src={photo.url} 
                        alt="Miniature" 
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-teal-500">PHOTO {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer flex items-center justify-center"
                          title="Supprimer cette photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Action technique accomplie (ex: Dépression et nettoyage interne...)"
                        value={photo.taskDescription}
                        onChange={(e) => handlePhotoDescChange(photo.id, e.target.value)}
                        className={`w-full text-xs px-2.5 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                          isDark ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-650" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-dashed border-slate-200/50 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-sans">Aperçu temps réel de la planche de collage :</span>
                <div className={`p-3 rounded-xl border border-dashed ${
                  isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-200/60 bg-slate-50/20"
                }`}>
                  <PhotoCollage photos={photos} theme={isDark ? "dark" : "light"} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Output & Final verification before registry insertion */}
        <div className={`border shadow-sm rounded-xl p-6 flex flex-col justify-between transition-colors duration-200 ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-900 text-white border-slate-852"
        }`}>
          <div className="space-y-4">
            <h3 className="text-base font-bold text-teal-400 border-b border-slate-800 pb-3 mb-1 flex items-center justify-between">
              <span>3. Rapport d'Intervention Final (Visualisation)</span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Validation & Archivage
              </span>
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Synthèse Rédigée Officielle (Sera incluse sur la fiche papier)
              </label>
              <textarea
                id="textarea-professional-summary"
                rows={4}
                required
                placeholder="La synthèse apparaîtra ici après reformulation IA ou écrivez manuellement le compte rendu."
                value={professionalSummary}
                onChange={(e) => setProfessionalSummary(e.target.value)}
                className="w-full text-white text-sm p-3 bg-slate-800/80 border border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Subtasks actions grid */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Actes Techniques Atomiques ({tasks.length})
              </label>
              <div className="bg-slate-850 border border-slate-800/85 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 font-mono scrollbar-thin">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800 group hover:border-slate-750">
                    <div className="text-xs truncate max-w-[80%]">
                      <span className="text-teal-400 mr-2">[{task.category}]</span>
                      <span className="text-slate-200">{task.description}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Aucune tâche spécifique listée. Utilisez l'IA ou ajoutez-en manuellement ci-dessous.
                  </div>
                )}
              </div>
            </div>

            {/* Quick addition of common tasks */}
            <div className="space-y-1 mt-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Actes fréquents (Saisie en 1 clic) :</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-850 rounded border border-slate-800 scrollbar-thin">
                {[
                  { text: "Diagnostic initial matériel & logiciel", cat: "Matériel" },
                  { text: "Dépoussiérage & nettoyage thermique complet", cat: "Matériel" },
                  { text: "Installation physique de mémoire RAM DDR4", cat: "Optimisation" },
                  { text: "Remplacement du disque dur par un SSD rapide", cat: "Matériel" },
                  { text: "Mise à jour corrective de sécurité système", cat: "Sécurité" },
                  { text: "Configuration d'IP statique & route réseaux", cat: "Réseau" },
                  { text: "Partage réseau local de l'unité d'impression", cat: "Réseau" },
                  { text: "Installation et activation de la suite bureautique officielle", cat: "Logiciel" },
                  { text: "Désinfection virale complète & nettoyage cache", cat: "Sécurité" }
                ].map((item, id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTasks(prev => [
                        ...prev,
                        { description: item.text, category: item.cat as any, status: "completed" }
                      ]);
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-750 text-teal-400 hover:text-white border border-slate-700/60 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    + {item.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick manual task insertion */}
            <div className="flex gap-2 bg-slate-850 p-2.5 rounded-lg border border-slate-800 mt-2">
              <input
                id="input-new-task-desc"
                type="text"
                placeholder="Ajouter textuellement un acte technique..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="flex-1 text-xs text-white bg-slate-800 px-3 py-2 border border-slate-700/80 rounded-md focus:outline-none"
              />
              <select
                id="select-new-task-cat"
                value={newTaskCat}
                onChange={(e) => setNewTaskCat(e.target.value as any)}
                className="text-xs text-slate-300 bg-slate-850 px-2 py-2 border border-slate-755 rounded-md focus:outline-none cursor-pointer font-sans"
              >
                {TASK_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddTask}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs px-3 font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 font-mono">STATUT INITIAL :</span>
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setStatus("termine")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer tracking-wider uppercase transition-all ${
                    status === "termine" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Terminé
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("en_cours")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer tracking-wider uppercase transition-all ${
                    status === "en_cours" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  En cours
                </button>
              </div>
            </div>

            <button
              id="btn-save-intervention"
              type="submit"
              className="bg-teal-500 hover:bg-teal-405 active:bg-teal-600 text-slate-950 text-sm font-extrabold px-6 py-3 rounded-xl shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Save className="w-4 h-4" />
              Valider et Enregistrer l'Intervention
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
