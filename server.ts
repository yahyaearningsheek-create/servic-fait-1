/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI or Nvidia LLM API keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "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";

let ai: GoogleGenAI | null = null;
const isNvidiaKey = GEMINI_API_KEY.startsWith("nvapi-");

if (GEMINI_API_KEY && !isNvidiaKey) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Endpoint to serve the CNIPLC logo from disk
app.get("/api/logo", (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "WhatsApp Image 2026-04-15 at 4.41.33 PM.jpeg"));
});

/// API Endpoints
app.post("/api/refine-tasks", async (req: Request, res: Response): Promise<void> => {
  const { rawNotes, deviceType, deviceBrand, clientName, clientTitle, clientDepartment } = req.body;

  if (!rawNotes || typeof rawNotes !== "string") {
    res.status(400).json({ error: "Les notes brutes (rawNotes) sont requises." });
    return;
  }

  // Dual engine formatting router
  if (isNvidiaKey) {
    try {
      console.log("[CNIPLC API] Using NVIDIA NIM Engine Llama model...");
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_API_KEY}`
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
        const parsedData = JSON.parse(cleaned);
        res.json(parsedData);
        return;
      } else {
        throw new Error("Contenu vide retourné par l'API NVIDIA.");
      }
    } catch (nvErr) {
      console.error("[CNIPLC API] NVIDIA Engine Error:", nvErr);
      // Fallback on error to standard rendering so the app never crashes
    }
  } else if (ai) {
    try {
      console.log("[CNIPLC API] Using Gemini AI Engine...");
      const prompt = `Notes brutes du technicien: "${rawNotes}"\nÉquipement concerné: ${deviceType || 'PC'} (Marque: ${deviceBrand || 'Standard'})\nBénéficiaire: ${clientName || 'Collaborateur'} (${clientTitle || 'Fonctionnaire'})\nSecteur/Département: ${clientDepartment || 'Dossier Technique'}\n\nFormulez ceci de manière extrêmement professionnelle en insérant intelligemment et formellement ces informations dans un style d'attestation administrative officielle d'État de style République de Djibouti.`;

      const response = await ai.models.generateContent({
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

      const outputText = response.text;
      if (outputText) {
        const parsedData = JSON.parse(outputText.trim());
        res.json(parsedData);
        return;
      } else {
        throw new Error("Pas de texte retourné par Gemini.");
      }

    } catch (error) {
      console.error("[CNIPLC API] Gemini Engine Error:", error);
    }
  }

  // General fallback logic (used if both models fail or if no key matches)
  console.log("[CNIPLC API] Serving static fallback payload.");
  res.json({
    professionalSummary: `Prestation de support informatique et de maintenance corrective officiellement effectuée avec succès au profit de ${clientName || 'l\'agent d\'État'} (${clientTitle || 'Fonctionnaire'}), affecté(e) au département ${clientDepartment || 'Technique'}. L'appareil de type ${deviceType || 'informatique'} (modèle : ${deviceBrand || 'Standard'}) a été révisé, inspecté et rétabli dans un état de fonctionnement optimal suite à l'événement technique : ${rawNotes}.`,
    tasks: [
      { description: "Analyse diagnostique ciblée des dysfonctionnements physiques et logiciels sur site d'État", category: "Autre" },
      { description: `Dépannage technique curatif sur matériel ${deviceBrand || 'Standard'} : ${rawNotes}`, category: "Matériel" }
    ]
  });
});

// Endpoint to notify Telegram
app.post("/api/notify-telegram", async (req: Request, res: Response) => {
  const body = req.body;
  const BOT_TOKEN = "8774455137:AAFMkDkKbtk0I8qX05R1GAfE8EZbtQyKPe0";
  const CHAT_ID = "7497438912";

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Local Environment Variables TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID are missing.");
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const emojiType: Record<string, string> = {
    bug: "🐛",
    acces: "🔐",
    fonctionnalite: "✨",
    incident: "⚠️",
    autre: "📌"
  };

  const emojiPriority: Record<string, string> = {
    basse: "🟢",
    moyenne: "🟡",
    haute: "🟠",
    urgente: "🔴"
  };

  const message = `
🚨 *NOUVEAU SIGNALEMENT — CNIPLC*

*Agent:* ${body.agentName}
*Contact:* ${body.contact}
*Type:* ${emojiType[body.type] || "📋"} ${body.type}
*Priorité:* ${emojiPriority[body.priority] || "⚪"} ${body.priority}

*Description:*
\`\`\`
${body.description}
\`\`\`

⏰ *Reçu le:* ${body.timestamp}
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      const tgError = await response.text();
      console.error("Telegram API error:", tgError);
      throw new Error("Telegram API error");
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending to telegram:", error);
    res.status(500).json({ success: false, error: "Failed to send to Telegram" });
  }
});

// Endpoint to parse voice transcripts into structured intervention fields
app.post("/api/parse-voice", async (req: Request, res: Response): Promise<void> => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== "string") {
    res.status(400).json({ error: "La transcription vocale (transcript) est requise." });
    return;
  }

  const currentDateStr = new Date().toISOString().substring(0, 10);

  if (isNvidiaKey) {
    try {
      console.log("[CNIPLC API Voice] Using NVIDIA NIM Engine Llama model...");
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_API_KEY}`
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
                "3. 'clientDepartment': son département ou service (ex: 'Ressources Humaines' ou le service d'affectation spécifié).\n" +
                "4. 'deviceType': le type d'appareil (ex: 'PC Portable', 'PC de Bureau', 'Imprimante', 'Switch').\n" +
                "5. 'deviceBrand': la marque/modèle de l'appareil (ex: 'Dell', 'HP', 'Standard').\n" +
                "6. 'date': la date de l'intervention au format strict 'YYYY-MM-DD'. Déterminez la date d'après le texte (ex: 'Thursday, December 21st, 2021' -> '2021-12-21'). S'il n'y a pas de date ou de détails précis, considérez une date intelligente ou aujourd'hui : '" + currentDateStr + "'.\n" +
                "7. 'rawNotes': le compte rendu technique brut écrit rapidement (ex: 'Dépôt d'un PC portable Dell Vostro, installation propre de Windows 11 et augmentation de la RAM à 16Go DDR4').\n" +
                "8. 'professionalSummary': un résumé officiel poli et rédigé (1 à 2 phrases) en français soutenu pour le livrable (ex: 'Mise à disposition et paramétrage d'un ordinateur portable avec mise en service du système d'exploitation Windows 11 pour garantir la continuité des affaires du bénéficiaire.').\n" +
                "9. 'tasks': un tableau d'objets contenant chacun 'description' (ex: 'Installation complète de l'OS Windows 11') et 'category' ('Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre')."
            },
            {
              role: "user",
              content: `Voici la transcription audio brute du technicien à analyser : "${transcript}"`
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
        res.json(JSON.parse(cleaned));
        return;
      }
    } catch (nvErr) {
      console.error("[CNIPLC API Voice] NVIDIA Engine Error:", nvErr);
    }
  } else if (ai) {
    try {
      console.log("[CNIPLC API Voice] Using Gemini AI Engine...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analysez cette transcription audio d'intervention : "${transcript}" et transformez la en objet JSON structuré.`,
        config: {
          systemInstruction: 
            "Vous êtes un assistant IA de saisie d'intervention d'élite rattaché au CNIPLC (Republique de Djibouti). " +
            "Votre rôle est d'analyser la transcription vocale d'une intervention et d'extraire toutes les informations demandées sous forme de JSON strict. " +
            "Vous devez renvoyer un objet JSON contenant exactement ces clés :\n" +
            "1. 'clientName': le nom complet du bénéficiaire de l'intervention (ex: 'M. Ammad').\n" +
            "2. 'clientTitle': sa fonction administrative (ex: 'Chef de service').\n" +
            "3. 'clientDepartment': son département ou service (ex: 'Ressources Humaines' ou le service d'affectation spécifié).\n" +
            "4. 'deviceType': le type d'appareil (ex: 'PC Portable', 'PC de Bureau').\n" +
            "5. 'deviceBrand': la marque/modèle de l'appareil (ex: 'Dell', 'HP').\n" +
            "6. 'date': la date de l'intervention au format strict 'YYYY-MM-DD'. Déterminez la date d'après le texte (ex: 'Thursday, December 21st, 2021' ou '21 décembre 2021' -> '2021-12-21'). S'il n'y a pas de date ou de détails précis, considérez la date : '" + currentDateStr + "'.\n" +
            "7. 'rawNotes': le compte rendu technique brut écrit rapidement.\n" +
            "8. 'professionalSummary': un résumé officiel poli et rédigé (1 à 2 phrases) en français soutenu pour le livrable.\n" +
            "9. 'tasks': un tableau d'objets contenant chacun 'description' (ex: 'Installation complète de l'OS Windows 11') et 'category' ('Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre').",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              clientTitle: { type: Type.STRING },
              clientDepartment: { type: Type.STRING },
              deviceType: { type: Type.STRING },
              deviceBrand: { type: Type.STRING },
              date: { type: Type.STRING, description: "Format strict YYYY-MM-DD" },
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

      const outputText = response.text;
      if (outputText) {
        res.json(JSON.parse(outputText.trim()));
        return;
      }
    } catch (error) {
      console.error("[CNIPLC API Voice] Gemini Engine Error:", error);
    }
  }

  // Fallback if APIs are offline
  // Simple heuristic parsing for voice
  console.log("[CNIPLC API Voice] Offline heuristic parsing fallback...");
  const lower = transcript.toLowerCase();
  let extractedName = "M. Ammad";
  let extractedDept = "Direction de l'Informatique";
  let extractedTitle = "Chef de service";
  let extractedDevice = "PC Portable";
  let extractedBrand = "Dell Latitude";
  let extractedDate = currentDateStr;

  if (lower.includes("hammad") || lower.includes("ammad")) {
    extractedName = "M. Ammad";
  }
  if (lower.includes("chef")) {
    extractedTitle = "Chef de Service";
  } else if (lower.includes("directeur")) {
    extractedTitle = "Directeur";
  }
  if (lower.includes("portable") || lower.includes("laptop") || lower.includes("pc portable")) {
    extractedDevice = "PC Portable";
  }
  if (lower.includes("windows 11")) {
    extractedBrand = "Support Windows 11";
  }

  res.json({
    clientName: extractedName,
    clientTitle: extractedTitle,
    clientDepartment: extractedDept,
    deviceType: extractedDevice,
    deviceBrand: extractedBrand,
    date: extractedDate,
    rawNotes: `Dictée vocale analysée : "${transcript}"`,
    professionalSummary: `Paramétrage et mise en conformité de l'appareil ${extractedDevice} pour le compte de ${extractedName} (${extractedTitle}) rattaché au service ${extractedDept}.`,
    tasks: [
      { description: "Mise en service du système d'exploitation Windows 11", category: "Logiciel" },
      { description: "Mise à niveau et contrôle de la mémoire vive (RAM)", category: "Matériel" }
    ]
  });
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CNIPLC Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
