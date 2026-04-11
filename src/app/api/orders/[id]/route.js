// GET /api/orders/[id] — Order detail by ID (requires guest_token)
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, payments } from "@/db/schema.js";
import { eq } from "drizzle-orm";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token akses diperlukan" },
        { status: 401 }
      );
    }

    // Find order
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (orderResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const order = orderResult[0];

    // Verify guest token
    if (order.guestToken !== token) {
      return NextResponse.json(
        { success: false, error: "Token akses tidak valid" },
        { status: 403 }
      );
    }

    // Get payment history
    const paymentHistory = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, id));

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        productName: order.productName,
        productPrice: order.productPrice,
        targetData: order.targetData,
        status: order.status,
        paymentMethod: order.paymentMethod,
        guestPhone: order.guestPhone,
        snapRedirectUrl: order.snapRedirectUrl,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        completedAt: order.completedAt,
        payments: paymentHistory.map((p) => ({
          paymentType: p.paymentType,
          transactionStatus: p.transactionStatus,
          grossAmount: p.grossAmount,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data pesanan" },
      { status: 500 }
    );
  }
}
