import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body;
  const BOT_TOKEN = "8774455137:AAFMkDkKbtk0I8qX05R1GAfE8EZbtQyKPe0";
  const CHAT_ID = "7497438912";

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Vercel Environment Variables TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID are missing.");
    return res.status(500).json({ error: 'Server misconfiguration' });
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending to telegram:", error);
    return res.status(500).json({ success: false, error: "Failed to send to Telegram" });
  }
}
