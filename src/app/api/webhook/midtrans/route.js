// POST /api/webhook/midtrans — Handle Midtrans payment callback
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, payments } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { nanoid } from "nanoid";

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

async function sendWhatsAppNotification(phone, message) {
  const wahaUrl = process.env.WAHA_API_URL;
  const wahaSession = process.env.WAHA_SESSION || "default";
  const wahaApiKey = process.env.WAHA_API_KEY;

  if (!wahaUrl) return;

  try {
    const chatId = phone.replace(/^0/, "62") + "@c.us";
    await fetch(`${wahaUrl}/api/sendText`, {
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
  } catch (err) {
    console.error("❌ WhatsApp notification failed:", err.message);
  }
}

// Verify Midtrans signature
function verifySignature(orderId, statusCode, grossAmount, serverKey) {
  const payload = orderId + statusCode + grossAmount + serverKey;
  return crypto.createHash("sha512").update(payload).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      order_id,
      transaction_id,
      transaction_status,
      status_code,
      gross_amount,
      payment_type,
      fraud_status,
      signature_key,
    } = body;

    console.log(`📬 Midtrans webhook: ${order_id} → ${transaction_status}`);

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const expectedSignature = verifySignature(order_id, status_code, gross_amount, serverKey);

    if (signature_key !== expectedSignature) {
      console.error("❌ Invalid Midtrans signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Find order by midtrans_order_id
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, order_id))
      .limit(1);

    if (orderResult.length === 0) {
      console.error(`❌ Order not found for midtrans_order_id: ${order_id}`);
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderResult[0];
    const now = new Date().toISOString();

    // Log payment
    await db.insert(payments).values({
      id: `PAY-${nanoid(12)}`,
      orderId: order.id,
      gateway: "midtrans",
      paymentType: payment_type,
      transactionId: transaction_id,
      transactionStatus: transaction_status,
      grossAmount: parseFloat(gross_amount),
      fraudStatus: fraud_status,
      rawResponse: JSON.stringify(body),
      createdAt: now,
    });

    // Determine new order status
    let newStatus = order.status;
    let statusUpdates = { updatedAt: now };

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        newStatus = "paid";
        statusUpdates.paidAt = now;
        statusUpdates.paymentMethod = payment_type;

        // For virtual products, auto-complete (simulate fulfillment)
        // In production, this would call Digipos/provider API
        newStatus = "completed";
        statusUpdates.completedAt = now;
      }
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      newStatus = "failed";
    }

    // Update order status
    await db
      .update(orders)
      .set({ status: newStatus, ...statusUpdates })
      .where(eq(orders.id, order.id));

    // Send WhatsApp notification based on status
    if (newStatus === "completed" && !order.whatsappSent) {
      sendWhatsAppNotification(
        order.guestPhone,
        `✅ *Pembayaran Berhasil — Telko.Store*\n\n` +
        `📦 Produk: ${order.productName}\n` +
        `📱 No. Tujuan: ${order.targetData}\n` +
        `💰 Total: ${formatRupiah(order.productPrice)}\n` +
        `💳 Pembayaran: ${payment_type}\n\n` +
        `✨ Produk sedang diproses dan akan segera masuk ke nomor tujuan.\n\n` +
        `📋 Invoice: ${order.id}\n` +
        `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}?token=${order.guestToken}`
      );

      await db
        .update(orders)
        .set({ whatsappSent: true })
        .where(eq(orders.id, order.id));
    } else if (newStatus === "failed") {
      sendWhatsAppNotification(
        order.guestPhone,
        `❌ *Pembayaran Gagal — Telko.Store*\n\n` +
        `📦 Produk: ${order.productName}\n` +
        `📋 Invoice: ${order.id}\n\n` +
        `Status: ${transaction_status}\n` +
        `Silakan coba lagi atau hubungi customer service.`
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("POST /api/webhook/midtrans error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
