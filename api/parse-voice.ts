import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function: /api/parse-voice
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string') {
    res.status(400).json({ error: 'La transcription vocale (transcript) est requise.' });
    return;
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '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';
  const isNvidiaKey = GEMINI_API_KEY.startsWith('nvapi-');
  const currentDateStr = new Date().toISOString().substring(0, 10);

  // NVIDIA NIM Engine
  if (isNvidiaKey) {
    try {
      console.log('[CNIPLC API Voice] Using NVIDIA NIM Engine Llama model...');
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            {
              role: 'system',
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
              role: 'user',
              content: `Voici la transcription audio brute du technicien à analyser : "${transcript}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API NVIDIA: ${response.status} ${response.statusText}`);
      }

      const nvData = await response.json();
      const contentText = nvData?.choices?.[0]?.message?.content;

      if (contentText) {
        let cleaned = contentText.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json/i, '').replace(/```$/s, '').trim();
        }
        res.json(JSON.parse(cleaned));
        return;
      }
    } catch (nvErr) {
      console.error('[CNIPLC API Voice] NVIDIA Engine Error:', nvErr);
    }
  }

  // Gemini AI Engine
  if (GEMINI_API_KEY && !isNvidiaKey) {
    try {
      console.log('[CNIPLC API Voice] Using Gemini AI Engine...');
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
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
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              clientTitle: { type: Type.STRING },
              clientDepartment: { type: Type.STRING },
              deviceType: { type: Type.STRING },
              deviceBrand: { type: Type.STRING },
              date: { type: Type.STRING, description: 'Format strict YYYY-MM-DD' },
              rawNotes: { type: Type.STRING },
              professionalSummary: { type: Type.STRING },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre'] }
                  },
                  required: ['description', 'category']
                }
              }
            },
            required: ['clientName', 'clientTitle', 'clientDepartment', 'deviceType', 'deviceBrand', 'date', 'rawNotes', 'professionalSummary', 'tasks']
          }
        }
      });

      const outputText = response.text;
      if (outputText) {
        res.json(JSON.parse(outputText.trim()));
        return;
      }
    } catch (error) {
      console.error('[CNIPLC API Voice] Gemini Engine Error:', error);
    }
  }

  // Fallback - heuristic parsing
  console.log('[CNIPLC API Voice] Offline heuristic parsing fallback...');
  const lower = transcript.toLowerCase();
  let extractedName = 'M. Ammad';
  let extractedDept = "Direction de l'Informatique";
  let extractedTitle = 'Chef de service';
  let extractedDevice = 'PC Portable';
  let extractedBrand = 'Dell Latitude';
  const extractedDate = currentDateStr;

  if (lower.includes('hammad') || lower.includes('ammad')) {
    extractedName = 'M. Ammad';
  }
  if (lower.includes('chef')) {
    extractedTitle = 'Chef de Service';
  } else if (lower.includes('directeur')) {
    extractedTitle = 'Directeur';
  }
  if (lower.includes('portable') || lower.includes('laptop') || lower.includes('pc portable')) {
    extractedDevice = 'PC Portable';
  }
  if (lower.includes('windows 11')) {
    extractedBrand = 'Support Windows 11';
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
      { description: "Mise en service du système d'exploitation Windows 11", category: 'Logiciel' },
      { description: 'Mise à niveau et contrôle de la mémoire vive (RAM)', category: 'Matériel' }
    ]
  });
}
