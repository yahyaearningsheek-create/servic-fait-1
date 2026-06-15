import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function: /api/refine-tasks
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { rawNotes, deviceType, deviceBrand, clientName, clientTitle, clientDepartment } = req.body;

  if (!rawNotes || typeof rawNotes !== 'string') {
    res.status(400).json({ error: 'Les notes brutes (rawNotes) sont requises.' });
    return;
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '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';
  const isNvidiaKey = GEMINI_API_KEY.startsWith('nvapi-');

  // NVIDIA NIM Engine
  if (isNvidiaKey) {
    try {
      console.log('[CNIPLC API] Using NVIDIA NIM Engine Llama model...');
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
                "Vous êtes un assistant IA de rédaction administrative d'État d'élite rattaché au CNIPLC (Centre National d'Informatique) de la République de Djibouti. " +
                "Votre rôle est d'aider les techniciens à reformuler leurs notes rapides en rapports d'intervention haut de gamme, rédigés dans un français officiel, clair, soutenu et rigoureux. " +
                "Vous devez impérativement intégrer de façon naturelle l'ensemble des données du formulaire : l'appareil résolu, sa marque, le nom complet du bénéficiaire, son titre/fonction et son département ministériel d'affectation pour produire un texte sur-mesure. " +
                "Vous devez obligatoirement renvoyer vos réponses au format JSON strict avec les clés de premier niveau suivantes :\n" +
                "1. 'professionalSummary': un compte rendu global, rédigé, fluide et respectueux décrivant l'ensemble de la prestation de service fait en français administratif, mentionnant le bénéficiaire, son titre, son département, et l'atteinte de la réparation.\n" +
                "2. 'tasks': une liste d'actes techniques précis (array d'objets) contenant chacun 'description' (le libellé de l'acte technique précis rédigé de façon professionnelle et détaillée, ex: 'Maintenance physique curative par démontage, dépoussiérage et remplacement de barrette mémoire active') " +
                "et 'category' (obligatoirement l'un des choix suivants: 'Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre')."
            },
            {
              role: 'user',
              content: `Équipement: ${deviceType || 'Ordinateur'} (${deviceBrand || 'Standard'})\nBénéficiaire d'État: ${clientName || 'Collaborateur'} - ${clientTitle || 'Fonctionnaire'} au sein du service : ${clientDepartment || 'Dossier Technique'}\nNotes brutes et rapides du technicien à formuler : "${rawNotes}"`
            }
          ],
          temperature: 0.2,
          max_tokens: 1024,
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
        const parsedData = JSON.parse(cleaned);
        res.json(parsedData);
        return;
      } else {
        throw new Error("Contenu vide retourné par l'API NVIDIA.");
      }
    } catch (nvErr) {
      console.error('[CNIPLC API] NVIDIA Engine Error:', nvErr);
      // Fall through to Gemini or fallback
    }
  }

  // Gemini AI Engine
  if (GEMINI_API_KEY && !isNvidiaKey) {
    try {
      console.log('[CNIPLC API] Using Gemini AI Engine...');
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Notes brutes du technicien: "${rawNotes}"\nÉquipement concerné: ${deviceType || 'PC'} (Marque: ${deviceBrand || 'Standard'})\nBénéficiaire: ${clientName || 'Collaborateur'} (${clientTitle || 'Fonctionnaire'})\nSecteur/Département: ${clientDepartment || 'Dossier Technique'}\n\nFormulez ceci de manière extrêmement professionnelle en insérant intelligemment et formellement ces informations dans un style d'attestation administrative officielle d'État de style République de Djibouti.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction:
            "Vous êtes un expert IA des rédactions techniques et administratives de haut niveau pour l'État, rattaché au CNIPLC (Centre National d'Informatique) de la République de Djibouti. " +
            "Votre mission est d'aider les techniciens à transformer leurs notes d'intervention rapides (ex: 'depan pc ram qui rame') en rapports techniques d'intervention " +
            "hautement professionnels, rédigés en français officiel, élégant, soutenu et précis. " +
            "Intégrez intelligemment le bénéficiaire, sa fonction officielle, son direction/département, ainsi que le matériel et sa marque dans un compte rendu global parfait. " +
            "Séparez l'intervention en une synthèse globale formelle personnalisée ('professionalSummary') " +
            "et une série d'actions techniques atomiques ('tasks') catégorisées.",
          responseMimeType: 'application/json',
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
                      enum: ['Matériel', 'Logiciel', 'Réseau', 'Sécurité', 'Optimisation', 'Autre'],
                      description: "La classification de l'action technique."
                    }
                  },
                  required: ['description', 'category']
                }
              }
            },
            required: ['professionalSummary', 'tasks']
          }
        }
      });

      const outputText = response.text;
      if (outputText) {
        const parsedData = JSON.parse(outputText.trim());
        res.json(parsedData);
        return;
      } else {
        throw new Error('Pas de texte retourné par Gemini.');
      }
    } catch (error) {
      console.error('[CNIPLC API] Gemini Engine Error:', error);
    }
  }

  // Fallback
  console.log('[CNIPLC API] Serving static fallback payload.');
  res.json({
    professionalSummary: `Prestation de support informatique et de maintenance corrective officiellement effectuée avec succès au profit de ${clientName || "l'agent d'État"} (${clientTitle || 'Fonctionnaire'}), affecté(e) au département ${clientDepartment || 'Technique'}. L'appareil de type ${deviceType || 'informatique'} (modèle : ${deviceBrand || 'Standard'}) a été révisé, inspecté et rétabli dans un état de fonctionnement optimal suite à l'événement technique : ${rawNotes}.`,
    tasks: [
      { description: "Analyse diagnostique ciblée des dysfonctionnements physiques et logiciels sur site d'État", category: 'Autre' },
      { description: `Dépannage technique curatif sur matériel ${deviceBrand || 'Standard'} : ${rawNotes}`, category: 'Matériel' }
    ]
  });
}
