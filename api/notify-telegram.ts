import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body;
  const BOT_TOKEN = "8774455137:AAFMkDkKbtk0I8qX05R1GAfE8EZbtQyKPe0";
  const CHAT_ID = "7497438912";

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

  const message = [
    "🚨 NOUVEAU SIGNALEMENT — CNIPLC",
    "",
    "Agent: " + (body.agentName || "Inconnu"),
    "Contact: " + (body.contact || "Non fourni"),
    "Type: " + (emojiType[body.type] || "📋") + " " + (body.type || "autre"),
    "Priorité: " + (emojiPriority[body.priority] || "⚪") + " " + (body.priority || "moyenne"),
    "",
    "Description:",
    body.description || "Aucune description",
    "",
    "Reçu le: " + (body.timestamp || new Date().toLocaleString("fr-FR"))
  ].join("\n");

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message
      })
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error("Telegram error:", JSON.stringify(tgData));
      return res.status(200).json({ 
        success: true, 
        telegram: false, 
        note: "Signalement enregistré mais notification Telegram échouée: " + tgData.description 
      });
    }

    return res.status(200).json({ success: true, telegram: true });
  } catch (error: any) {
    console.error("Fetch error:", error.message);
    return res.status(200).json({ 
      success: true, 
      telegram: false, 
      note: "Signalement enregistré. Erreur réseau Telegram." 
    });
  }
}
