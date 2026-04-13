// POST /api/checkout — Create order + Midtrans Snap Token
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products, orders } from "@/db/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

import { isValidIndonesianNumber } from "@/lib/utils";
import { sendWhatsAppNotification, formatRupiahServer } from "@/lib/whatsapp";
import { createSnapClient } from "@/lib/midtrans";

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, phoneNumber, paymentMethod, gameData, targetData: customTargetData } = body;

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

    // Determine targetData — use game data for voucher games, phone number for others
    let resolvedTargetData = phoneNumber;
    if (product.categoryId === "voucher-game" && customTargetData) {
      resolvedTargetData = customTargetData;
    }

    // Generate IDs
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
    const orderId = `INV-${datePrefix}-${nanoid(8).toUpperCase()}`;
    const guestToken = nanoid(32);
    const midtransOrderId = `TELKO-${orderId}`;

    // Create Midtrans Snap transaction
    const snap = createSnapClient();

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
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${midtransOrderId}&token=${guestToken}`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${midtransOrderId}&token=${guestToken}&status=error`,
        unfinish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${midtransOrderId}&token=${guestToken}&status=unfinish`,
      },
      expiry: {
        unit: "hours",
        duration: 24,
      },
    });

    // Build notes with game data if present
    let notes = null;
    if (gameData) {
      notes = JSON.stringify(gameData);
    }

    // Create order in database
    await db.insert(orders).values({
      id: orderId,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      guestPhone: phoneNumber,
      guestToken: guestToken,
      targetData: resolvedTargetData,
      status: "pending",
      paymentMethod: paymentMethod || null,
      snapToken: snapTransaction.token,
      snapRedirectUrl: snapTransaction.redirect_url,
      midtransOrderId: midtransOrderId,
      notes: notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // Decrease stock
    await db
      .update(products)
      .set({ stock: product.stock - 1 })
      .where(eq(products.id, product.id));

    // Build WA message
    let waMessage = `🛒 *Pesanan Dibuat — Telko.Store*\n\n` +
      `📦 Produk: ${product.name}\n`;

    if (product.categoryId === "voucher-game" && gameData) {
      waMessage += `🎮 Game: ${gameData.gameName || product.gameName}\n`;
      waMessage += `🆔 Data Akun: ${resolvedTargetData}\n`;
    }

    waMessage += `📱 No. HP: ${phoneNumber}\n` +
      `💰 Total: ${formatRupiahServer(product.price)}\n\n` +
      `🔗 Bayar sekarang:\n${snapTransaction.redirect_url}\n\n` +
      `📋 Invoice: ${orderId}\n` +
      `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${orderId}?token=${guestToken}`;

    // Send WhatsApp - order created
    sendWhatsAppNotification(phoneNumber, waMessage);

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
