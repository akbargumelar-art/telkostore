// GET /api/orders/search — Search orders by phone or invoice
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders } from "@/db/schema.js";
import { eq, or, like, desc } from "drizzle-orm";

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

    // Search by invoice ID or phone number
    const result = await db
      .select({
        id: orders.id,
        productName: orders.productName,
        productPrice: orders.productPrice,
        guestPhone: orders.guestPhone,
        targetData: orders.targetData,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        guestToken: orders.guestToken,
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

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("GET /api/orders/search error:", error);
    return NextResponse.json(
      { success: false, error: "Pencarian gagal" },
      { status: 500 }
    );
  }
}
