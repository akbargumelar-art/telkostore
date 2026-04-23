// GET /api/orders/search — Search orders by phone or invoice
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders } from "@/db/schema.js";
import { or, like, desc } from "drizzle-orm";
import { reconcileVisiblePendingOrders } from "@/lib/payment-reconciliation";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json(
        { success: false, error: "Masukkan minimal 3 karakter untuk pencarian" },
        { status: 400 }
      );
    }

    // [FIX 3.3] Search by invoice ID or phone number — DO NOT expose full guestToken
    const result = await db
      .select({
        id: orders.id,
        productId: orders.productId,
        productName: orders.productName,
        productPrice: orders.productPrice,
        guestPhone: orders.guestPhone,
        targetData: orders.targetData,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentGateway: orders.paymentGateway,
        midtransOrderId: orders.midtransOrderId,
        guestToken: orders.guestToken,
        whatsappSent: orders.whatsappSent,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        completedAt: orders.completedAt,
      })
      .from(orders)
      .where(
        or(
          like(orders.id, `%${query}%`),
          like(orders.guestPhone, `%${query}%`),
          like(orders.targetData, `%${query}%`)
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(20);

    const syncedResult = await reconcileVisiblePendingOrders(result, {
      source: "order_search",
      limit: 5,
    });

    const normalizedQuery = query.replace(/\D/g, "");

    // Mask sensitive fields - only return the access token for an exact phone lookup.
    const safeResult = syncedResult.map(
      ({
        guestToken,
        guestPhone,
        paymentGateway,
        midtransOrderId,
        whatsappSent,
        productId,
        ...rest
      }) => {
        const normalizedPhone = (guestPhone || "").replace(/\D/g, "");
        const canOpenDetail =
          normalizedQuery.length >= 10 && normalizedQuery === normalizedPhone;

        return {
          ...rest,
          guestPhone: guestPhone
            ? `${guestPhone.slice(0, 4)}****${guestPhone.slice(-3)}`
            : "—",
          guestToken: canOpenDetail ? guestToken : null,
          detailAvailable: canOpenDetail,
        };
      }
    );

    return NextResponse.json({
      success: true,
      data: safeResult,
      count: safeResult.length,
    });
  } catch (error) {
    console.error("GET /api/orders/search error:", error);
    return NextResponse.json(
      { success: false, error: "Pencarian gagal" },
      { status: 500 }
    );
  }
}
