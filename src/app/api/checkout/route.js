// POST /api/checkout — Create order + Midtrans Snap Token
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products, orders } from "@/db/schema.js";
import { eq, and, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { isValidIndonesianNumber } from "@/lib/utils";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildOrderCreatedMsg,
  buildGroupNewOrderMsg,
} from "@/lib/whatsapp";
import { createSnapClient } from "@/lib/midtrans";
import { checkoutLimiter } from "@/lib/rate-limit";

export async function POST(request) {
  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const rateCheck = checkoutLimiter.check(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) } }
    );
  }
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
    if (product.categoryId === "voucher-game") {
      if (!customTargetData || !gameData || Object.keys(gameData).length === 0) {
        return NextResponse.json(
          { success: false, error: "Data akun game wajib diisi" },
          { status: 400 }
        );
      }

      resolvedTargetData = String(customTargetData).trim();
      if (!resolvedTargetData || resolvedTargetData.length > 250) {
        return NextResponse.json(
          { success: false, error: "Data akun game tidak valid" },
          { status: 400 }
        );
      }
    }

    // Generate IDs
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");
    const orderId = `INV-${datePrefix}-${nanoid(8).toUpperCase()}`;
    const guestToken = nanoid(32);
    const midtransOrderId = `TELKO-${orderId}`;

    // Create Midtrans Snap transaction
    const snap = await createSnapClient();

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

    // [FIX 3.1] Wrap order creation + stock decrease in a database transaction
    db.transaction((tx) => {
      // [FIX 2.3] Atomic stock decrease with an in-DB stock guard
      const stockUpdate = tx
        .update(products)
        .set({ stock: sql`${products.stock} - 1` })
        .where(and(eq(products.id, product.id), gt(products.stock, 0)))
        .returning({ id: products.id })
        .all();

      if (stockUpdate.length === 0) {
        throw new Error("Stok produk habis");
      }

      tx.insert(orders).values({
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
      }).run();
    });

    // [FIX 8.1] Send enriched WhatsApp to buyer — order created
    const orderData = {
      id: orderId,
      productName: product.name,
      productPrice: product.price,
      guestPhone: phoneNumber,
      guestToken: guestToken,
      targetData: resolvedTargetData,
    };

    try {
      await sendWhatsAppNotification(
        phoneNumber,
        buildOrderCreatedMsg(orderData, product, snapTransaction.redirect_url, gameData)
      );
    } catch (waErr) {
      console.error("WA buyer notification failed:", waErr.message);
    }

    // [FIX 8.2] Send WhatsApp to internal group
    try {
      await sendGroupNotification(
        buildGroupNewOrderMsg(orderData, product)
      );
    } catch (waErr) {
      console.error("WA group notification failed:", waErr.message);
    }

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
    if (error.message === "Stok produk habis") {
      return NextResponse.json(
        { success: false, error: "Stok produk habis" },
        { status: 400 }
      );
    }

    // Sanitize error — never expose internal details to client
    return NextResponse.json(
      { success: false, error: "Checkout gagal. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
