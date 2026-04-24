import { NextResponse } from "next/server";

import { verifyDigiflazzWebhookSignature } from "@/lib/digiflazz";
import { syncDigiflazzWebhookFulfillment } from "@/lib/order-fulfillment";
import { sendGroupNotification, sendWhatsAppNotification } from "@/lib/whatsapp";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Digiflazz webhook endpoint is active",
  });
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-hub-signature");
    const eventName = request.headers.get("x-digiflazz-event");

    if (!verifyDigiflazzWebhookSignature(rawBody, signatureHeader)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 403 }
      );
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};

    if (eventName === "ping") {
      return NextResponse.json({ success: true, message: "pong" });
    }

    const result = await syncDigiflazzWebhookFulfillment(payload, {
      sendWA: sendWhatsAppNotification,
      sendGroup: sendGroupNotification,
    });

    if (!result.found) {
      console.warn("[digiflazz webhook] ignored:", result.skippedReason, result.refId || "");
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: result.skippedReason,
      });
    }

    return NextResponse.json({
      success: true,
      status: result.orderStatus,
      orderId: result.order?.id || null,
    });
  } catch (error) {
    console.error("POST /api/webhook/digiflazz error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
