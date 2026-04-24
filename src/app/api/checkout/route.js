// POST /api/checkout — Create order + Payment (auto-route to active gateway)
//
// Admin controls which payment gateway is active (Midtrans, Pakasir, or DOKU).
// Customers are automatically routed — no gateway selection on frontend.

import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { products, orders } from "@/db/schema.js";
import { eq, and, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  VOUCHER_REGION_APPROVAL_TEXT,
  isValidIndonesianNumber,
  validateVoucherInternetCheckout,
} from "@/lib/utils";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildOrderCreatedMsg,
  buildGroupNewOrderMsg,
} from "@/lib/whatsapp";
import { createSnapClient } from "@/lib/midtrans";
import { createPakasirTransaction } from "@/lib/pakasir";
import { createDokuTransaction } from "@/lib/doku";
import { getActiveGateway } from "@/app/api/gateway/status/route";
import { checkoutLimiter } from "@/lib/rate-limit";
import { scheduleNotification } from "@/lib/notification-scheduler";
import {
  getVoucherStockBreakdown,
  usesVoucherCodeStock,
} from "@/lib/product-stock";

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
    const {
      productId,
      phoneNumber,
      paymentMethod,
      gameData,
      targetData: customTargetData,
      voucherRegionApproved,
    } = body;

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

    // Auto-detect active payment gateway (admin-controlled)
    const { activeGateway } = await getActiveGateway();
    const selectedGateway = activeGateway;

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

    const voucherValidation = validateVoucherInternetCheckout(product, phoneNumber);
    if (!voucherValidation.valid) {
      return NextResponse.json(
        { success: false, error: voucherValidation.message || "Nomor tidak cocok dengan produk" },
        { status: 400 }
      );
    }

    if (
      product.categoryId === "voucher-internet" &&
      voucherRegionApproved !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `${VOUCHER_REGION_APPROVAL_TEXT} Setujui ketentuan ini sebelum checkout.`,
        },
        { status: 400 }
      );
    }

    const managedByVoucherCodes = usesVoucherCodeStock(product);

    if (managedByVoucherCodes) {
      const breakdown = await getVoucherStockBreakdown(product.id);
      if (breakdown.stock <= 0) {
        return NextResponse.json(
          { success: false, error: "Stok produk habis" },
          { status: 400 }
        );
      }
    } else if (product.stock <= 0) {
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
    const externalOrderId = `TELKO-${orderId}`;

    // Build notes with game data if present
    let notes = null;
    if (gameData) {
      notes = JSON.stringify(gameData);
    }

    let paymentResult;
    const nowIso = now.toISOString();

    const createPendingOrder = async (tx, gatewayName, paymentData) => {
      if (managedByVoucherCodes) {
        await tx.execute(
          sql`SELECT id FROM products WHERE id = ${product.id} LIMIT 1 FOR UPDATE`
        );

        const breakdown = await getVoucherStockBreakdown(product.id, tx);
        if (breakdown.stock <= 0) {
          throw new Error("Stok produk habis");
        }

        await tx
          .update(products)
          .set({
            stock: breakdown.stock - 1,
            updatedAt: nowIso,
          })
          .where(eq(products.id, product.id));
      } else {
        await tx.update(products)
          .set({ stock: sql`${products.stock} - 1` })
          .where(and(eq(products.id, product.id), gt(products.stock, 0)));

        const [check] = await tx.select({ stock: products.stock })
          .from(products)
          .where(eq(products.id, product.id))
          .limit(1);

        if (!check || check.stock < 0) {
          throw new Error("Stok produk habis");
        }
      }

      await tx.insert(orders).values({
        id: orderId,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        guestPhone: phoneNumber,
        guestToken: guestToken,
        targetData: resolvedTargetData,
        status: "pending",
        paymentMethod: paymentMethod || null,
        paymentGateway: gatewayName,
        snapToken: paymentData.snapToken,
        snapRedirectUrl: paymentData.snapRedirectUrl,
        midtransOrderId: externalOrderId,
        notes: notes,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    };

    if (selectedGateway === "pakasir") {
      // ===== PAKASIR FLOW =====
      const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${externalOrderId}&token=${guestToken}&gateway=pakasir`;

      paymentResult = await createPakasirTransaction({
        orderId: externalOrderId,
        amount: product.price,
        productName: product.name,
        customerPhone: phoneNumber,
        callbackUrl,
      });

      // Atomic stock decrease + order insert (MySQL async transaction)
      await db.transaction(async (tx) => {
        await createPendingOrder(tx, "pakasir", {
          snapToken: null,
          snapRedirectUrl: paymentResult.paymentUrl,
        });
      });

    } else if (selectedGateway === "doku") {
      // ===== DOKU FLOW =====
      const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${externalOrderId}&token=${guestToken}&gateway=doku`;
      const failedUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${externalOrderId}&token=${guestToken}&status=error&gateway=doku`;

      paymentResult = await createDokuTransaction({
        orderId: externalOrderId,
        amount: product.price,
        productName: product.name,
        customerPhone: phoneNumber,
        callbackUrl,
        failedUrl,
      });

      // Atomic stock decrease + order insert
      await db.transaction(async (tx) => {
        await createPendingOrder(tx, "doku", {
          snapToken: null,
          snapRedirectUrl: paymentResult.paymentUrl,
        });
      });

    } else {
      // ===== MIDTRANS FLOW (default) =====
      const snap = await createSnapClient();

      const snapTransaction = await snap.createTransaction({
        transaction_details: {
          order_id: externalOrderId,
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
          finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${externalOrderId}&token=${guestToken}&gateway=midtrans`,
          error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${externalOrderId}&token=${guestToken}&status=error&gateway=midtrans`,
          unfinish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish?order_id=${externalOrderId}&token=${guestToken}&status=unfinish&gateway=midtrans`,
        },
        expiry: {
          unit: "hours",
          duration: 24,
        },
      });

      paymentResult = {
        paymentUrl: snapTransaction.redirect_url,
        snapToken: snapTransaction.token,
      };

      // Atomic stock decrease + order insert (MySQL async transaction)
      await db.transaction(async (tx) => {
        await createPendingOrder(tx, "midtrans", {
          snapToken: snapTransaction.token,
          snapRedirectUrl: snapTransaction.redirect_url,
        });
      });
    }

    // Schedule delayed WA notification (only if still pending after 10s)
    const orderData = {
      id: orderId,
      productName: product.name,
      productPrice: product.price,
      guestPhone: phoneNumber,
      guestToken: guestToken,
      targetData: resolvedTargetData,
    };

    scheduleNotification(orderId, 10_000, async () => {
      const [latestOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!latestOrder || latestOrder.status !== "pending") {
        console.log(
          `Order notification skipped for ${orderId}; status: ${latestOrder?.status || "not found"}`
        );
        return;
      }

      try {
        await sendWhatsAppNotification(
          phoneNumber,
          buildOrderCreatedMsg(orderData, product, paymentResult.paymentUrl, gameData)
        );
      } catch (waErr) {
        console.error("WA buyer notification failed:", waErr.message);
      }

      try {
        await sendGroupNotification(
          buildGroupNewOrderMsg(orderData, product)
        );
      } catch (waErr) {
        console.error("WA group notification failed:", waErr.message);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        guestToken,
        snapToken: paymentResult.snapToken || null,
        snapRedirectUrl: paymentResult.paymentUrl || paymentResult.snapRedirectUrl,
        midtransOrderId: externalOrderId,
        gateway: selectedGateway,
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
