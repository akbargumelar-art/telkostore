// POST /api/contact — Handle contact form submission
import { NextResponse } from "next/server";
import {
  sendGroupNotification,
  buildGroupContactFormMsg,
} from "@/lib/whatsapp";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Nama, email, dan pesan wajib diisi" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Format email tidak valid" },
        { status: 400 }
      );
    }

    // Send notification to internal WhatsApp group
    try {
      await sendGroupNotification(
        buildGroupContactFormMsg(name, email, subject, message)
      );
    } catch (waErr) {
      console.error("Contact form WA notification failed:", waErr.message);
    }

    console.log(`📬 Contact form: ${name} <${email}> — ${subject || "No subject"}`);

    return NextResponse.json({
      success: true,
      message: "Pesan berhasil dikirim",
    });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengirim pesan" },
      { status: 500 }
    );
  }
}
