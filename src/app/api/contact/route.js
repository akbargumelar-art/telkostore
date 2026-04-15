// POST /api/contact — Handle contact form submission
import { NextResponse } from "next/server";
import {
  sendGroupNotification,
  buildGroupContactFormMsg,
} from "@/lib/whatsapp";
import { contactLimiter } from "@/lib/rate-limit";

export async function POST(request) {
  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const rateCheck = contactLimiter.check(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak pesan. Silakan coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) } }
    );
  }
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

    // Validate input length to prevent abuse
    if (name.length > 100 || email.length > 100 || message.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Input melebihi batas karakter" },
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
