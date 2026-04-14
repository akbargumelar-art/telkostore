// PUT /api/admin/orders/[id] — Update order status, add tracking, send WA
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import {
  sendWhatsAppNotification,
  buildOrderCompletedMsg,
  buildOrderProcessingMsg,
} from "@/lib/whatsapp";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data pesanan" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const existing = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const order = existing[0];
    const now = new Date().toISOString();
    const updateData = { updatedAt: now };

    if (status) {
      updateData.status = status;
      if (status === "paid") updateData.paidAt = now;
      if (status === "completed") updateData.completedAt = now;
    }

    if (notes !== undefined) updateData.notes = notes;

    // Send WhatsApp based on status change
    if (status === "completed" && order.status !== "completed") {
      await sendWhatsAppNotification(
        order.guestPhone,
        buildOrderCompletedMsg(order)
      );
      updateData.whatsappSent = true;
    }

    if (status === "processing" && order.status !== "processing") {
      await sendWhatsAppNotification(
        order.guestPhone,
        buildOrderProcessingMsg(order)
      );
    }

    await db.update(orders).set(updateData).where(eq(orders.id, id));

    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil diperbarui",
    });
  } catch (error) {
    console.error("PUT /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui pesanan" },
      { status: 500 }
    );
  }
}
