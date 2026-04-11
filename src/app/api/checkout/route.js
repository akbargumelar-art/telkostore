// POST /api/checkout — Create order + Midtrans Snap Token
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products, orders } from "@/db/schema.js";
import { eq, and } from "drizzle-orm";
import midtransClient from "midtrans-client";
import { nanoid } from "nanoid";

import { isValidIndonesianNumber } from "@/lib/utils";

// WAHA WhatsApp notification helper
async function sendWhatsAppNotification(phone, message) {
  const wahaUrl = process.env.WAHA_API_URL;
  const wahaSession = process.env.WAHA_SESSION || "default";
  const wahaApiKey = process.env.WAHA_API_KEY;

  if (!wahaUrl) return;

  try {
    // Format phone: 08xxx → 628xxx
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
    console.log(`✅ WhatsApp sent to ${phone}`);
  } catch (err) {
    console.error("❌ WhatsApp notification failed:", err.message);
  }
}

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, phoneNumber, paymentMethod } = body;

    // Validate input
    if (!productId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "productId dan phoneNumber wajib diisi" },
        { status: 400 }
      );
    }

    // Validate Phone Number
    if (!isValidIndonesianNumber(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: "Nomor HP harus nomor Indonesia yang valid (10-13 digit)" },
        { status: 400 }
      );
    }

    // Get product from DB
    const productResult = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (productResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const product = productResult[0];

    // Check stock
    if (product.stock <= 0) {
      return NextResponse.json(
        { success: false, error: "Stok produk habis" },
        { status: 400 }
      );
    }

    // Generate IDs
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
    const orderId = `INV-${datePrefix}-${nanoid(8).toUpperCase()}`;
    const guestToken = nanoid(32);
    const midtransOrderId = `TELKO-${orderId}`;

    // Create Midtrans Snap transaction
    const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    const snapTransaction = await snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: product.price,
      },
      item_details: [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          category: product.categoryId,
        },
      ],
      customer_details: {
        phone: phoneNumber,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/order/${orderId}?token=${guestToken}`,
      },
    });

    // Create order in database
    await db.insert(orders).values({
      id: orderId,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      guestPhone: phoneNumber,
      guestToken: guestToken,
      targetData: phoneNumber,
      status: "pending",
      paymentMethod: paymentMethod || null,
      snapToken: snapTransaction.token,
      snapRedirectUrl: snapTransaction.redirect_url,
      midtransOrderId: midtransOrderId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // Decrease stock
    await db
      .update(products)
      .set({ stock: product.stock - 1 })
      .where(eq(products.id, product.id));

    // Send WhatsApp - order created
    sendWhatsAppNotification(
      phoneNumber,
      `🛒 *Pesanan Dibuat — Telko.Store*\n\n` +
      `📦 Produk: ${product.name}\n` +
      `📱 No. Tujuan: ${phoneNumber}\n` +
      `💰 Total: ${formatRupiah(product.price)}\n\n` +
      `🔗 Bayar sekarang:\n${snapTransaction.redirect_url}\n\n` +
      `📋 Invoice: ${orderId}\n` +
      `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${orderId}?token=${guestToken}`
    );

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        guestToken,
        snapToken: snapTransaction.token,
        snapRedirectUrl: snapTransaction.redirect_url,
        midtransOrderId,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      },
    });
  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Checkout gagal" },
      { status: 500 }
    );
  }
}
