// POST /api/orders/[id]/check — Check Midtrans status & sync order
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, payments, products } from "@/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createCoreClient } from "@/lib/midtrans";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildPaymentSuccessMsg,
  buildPaymentFailedMsg,
  buildGroupPaymentSuccessMsg,
  buildGroupPaymentFailedMsg,
} from "@/lib/whatsapp";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token required" },
        { status: 400 }
      );
    }

    // Find order
    const result = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.guestToken, token)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = result[0];

    // Only check if order is still pending
    if (order.status !== "pending") {
      return NextResponse.json({
        success: true,
        data: order,
        message: "Order already updated",
      });
    }

    // Check Midtrans status directly
    if (!order.midtransOrderId) {
      return NextResponse.json({
        success: true,
        data: order,
        message: "No Midtrans order ID",
      });
    }

    try {
      const core = await createCoreClient();
      const statusResponse = await core.transaction.status(order.midtransOrderId);

      const { transaction_status, payment_type, fraud_status } = statusResponse;
      const now = new Date().toISOString();

      let newStatus = order.status;
      const statusUpdates = { updatedAt: now };

      if (transaction_status === "capture" || transaction_status === "settlement") {
        if (fraud_status === "accept" || !fraud_status) {
          // [FIX 2.2] Check product type for virtual vs fisik
          const productResult = await db
            .select()
            .from(products)
            .where(eq(products.id, order.productId))
            .limit(1);
          const productType = productResult[0]?.type || "virtual";

          statusUpdates.paidAt = now;
          statusUpdates.paymentMethod = payment_type;

          if (productType === "virtual") {
            newStatus = "completed";
            statusUpdates.completedAt = now;
          } else {
            newStatus = "paid";
          }
        }
      } else if (
        transaction_status === "deny" ||
        transaction_status === "cancel" ||
        transaction_status === "expire"
      ) {
        newStatus = "failed";

        // [FIX 2.3] Atomic stock rollback
        if (order.status !== "failed") {
          try {
            await db
              .update(products)
              .set({ stock: sql`stock + 1` })
              .where(eq(products.id, order.productId));
          } catch (stockErr) {
            console.error("Stock rollback failed:", stockErr.message);
          }
        }
      }

      if (newStatus !== order.status) {
        // Update order
        await db
          .update(orders)
          .set({ status: newStatus, ...statusUpdates })
          .where(eq(orders.id, order.id));

        // Log payment
        await db.insert(payments).values({
          id: `PAY-${nanoid(12)}`,
          orderId: order.id,
          gateway: "midtrans",
          paymentType: payment_type,
          transactionId: statusResponse.transaction_id,
          transactionStatus: transaction_status,
          grossAmount: parseFloat(statusResponse.gross_amount),
          fraudStatus: fraud_status,
          rawResponse: JSON.stringify(statusResponse),
          createdAt: now,
        });

        // [FIX 8.1/8.2] Send WhatsApp for completed/paid
        if ((newStatus === "completed" || newStatus === "paid") && !order.whatsappSent) {
          try {
            await sendWhatsAppNotification(
              order.guestPhone,
              buildPaymentSuccessMsg(order, payment_type)
            );
            await db
              .update(orders)
              .set({ whatsappSent: true })
              .where(eq(orders.id, order.id));
          } catch (waErr) {
            console.error("WA notification failed:", waErr.message);
          }

          // Notify internal group
          try {
            await sendGroupNotification(
              buildGroupPaymentSuccessMsg(order, payment_type)
            );
          } catch (waErr) {
            console.error("WA group notification failed:", waErr.message);
          }
        } else if (newStatus === "failed") {
          try {
            await sendWhatsAppNotification(
              order.guestPhone,
              buildPaymentFailedMsg(order, transaction_status)
            );
          } catch (waErr) {
            console.error("WA notification failed:", waErr.message);
          }

          try {
            await sendGroupNotification(
              buildGroupPaymentFailedMsg(order, transaction_status)
            );
          } catch (waErr) {
            console.error("WA group notification failed:", waErr.message);
          }
        }

        // Return updated order
        const [updatedOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, order.id))
          .limit(1);

        return NextResponse.json({
          success: true,
          data: updatedOrder,
          message: `Status updated: ${order.status} → ${newStatus}`,
        });
      }

      return NextResponse.json({
        success: true,
        data: order,
        message: "No status change",
      });
    } catch (mtErr) {
      // Midtrans API error (e.g. sandbox down, network issue)
      console.warn("Midtrans status check failed:", mtErr.message);
      return NextResponse.json({
        success: true,
        data: order,
        message: "Midtrans check failed, returning cached status",
      });
    }
  } catch (error) {
    console.error("POST /api/orders/[id]/check error:", error);
    return NextResponse.json(
      { success: false, error: "Check failed" },
      { status: 500 }
    );
  }
}
