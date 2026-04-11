// ==============================
// TELKO.STORE — WhatsApp Notification Helper
// Centralized WAHA integration
// ==============================

/**
 * Send a WhatsApp text message via WAHA API
 * @param {string} phone - Indonesian phone number (08xxx format)
 * @param {string} message - Message text (supports WhatsApp formatting)
 */
export async function sendWhatsAppNotification(phone, message) {
  const wahaUrl = process.env.WAHA_API_URL;
  const wahaSession = process.env.WAHA_SESSION || "default";
  const wahaApiKey = process.env.WAHA_API_KEY;

  if (!wahaUrl) {
    console.warn("⚠️ WAHA_API_URL not set, skipping WhatsApp notification");
    return;
  }

  try {
    // Format phone: 08xxx → 628xxx@c.us
    const chatId = phone.replace(/^0/, "62") + "@c.us";

    const res = await fetch(`${wahaUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(wahaApiKey ? { "X-Api-Key": wahaApiKey } : {}),
      },
      body: JSON.stringify({
        session: wahaSession,
        chatId,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error(`❌ WhatsApp API error: ${res.status} ${res.statusText}`);
      return;
    }

    console.log(`✅ WhatsApp sent to ${phone}`);
  } catch (err) {
    console.error("❌ WhatsApp notification failed:", err.message);
  }
}

/**
 * Format Rupiah for WhatsApp messages (server-side)
 */
export function formatRupiahServer(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}
