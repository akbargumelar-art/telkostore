// GET /api/admin/orders — List all orders with pagination & filters
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/db/index.js";
import { orders, payments, voucherCodes } from "@/db/schema.js";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { verifyAdminToken } from "@/lib/jwt";
import { syncVoucherProductStock } from "@/lib/product-stock";
import { reconcileVisiblePendingOrders } from "@/lib/payment-reconciliation";
import { ensureVoucherFulfillment } from "@/lib/voucher";
import { sendWhatsAppNotification, sendGroupNotification } from "@/lib/whatsapp";

const DELETE_CONFIRM_TEXT = "HAPUS PESANAN";
const DELETE_CHUNK_SIZE = 250;

async function requireSuperadmin() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;
  const tokenData = verifyAdminToken(adminToken);

  if (!tokenData) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const adminType = tokenData.adminType || "superadmin";
  if (adminType !== "superadmin") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Hanya superadmin yang dapat menghapus riwayat pesanan.",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, tokenData };
}

function buildOrderConditions({ status, search }) {
  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(orders.status, status));
  }
  if (search) {
    conditions.push(
      or(
        like(orders.id, `%${search}%`),
        like(orders.guestPhone, `%${search}%`),
        like(orders.productName, `%${search}%`)
      )
    );
  }

  return conditions;
}

function applyConditions(query, conditions) {
  if (conditions.length === 0) return query;
  return query.where(and(...conditions));
}

function chunk(items, size = DELETE_CHUNK_SIZE) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions = buildOrderConditions({ status, search });

    let query = db.select().from(orders);
    query = applyConditions(query, conditions);

    const result = await query
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const syncedOrders = await reconcileVisiblePendingOrders(result, {
      source: "control_orders",
      limit: Math.min(limit, 10),
    });

    // Count total
    let countQuery = db.select({ total: sql`COUNT(*)` }).from(orders);
    countQuery = applyConditions(countQuery, conditions);
    const [{ total }] = await countQuery;

    return NextResponse.json({
      success: true,
      data: syncedOrders,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/orders - delete order history, superadmin only
export async function DELETE(request) {
  try {
    const auth = await requireSuperadmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const {
      orderIds,
      deleteMatching = false,
      status = "all",
      search = "",
      confirmText = "",
    } = body || {};

    if (confirmText !== DELETE_CONFIRM_TEXT) {
      return NextResponse.json(
        { success: false, error: `Ketik "${DELETE_CONFIRM_TEXT}" untuk menghapus riwayat pesanan.` },
        { status: 400 }
      );
    }

    let targetOrders = [];

    if (deleteMatching) {
      const conditions = buildOrderConditions({ status, search });
      let targetQuery = db
        .select({
          id: orders.id,
          productId: orders.productId,
          status: orders.status,
        })
        .from(orders);

      targetQuery = applyConditions(targetQuery, conditions);
      targetOrders = await targetQuery;
    } else if (Array.isArray(orderIds) && orderIds.length > 0) {
      const uniqueIds = [...new Set(orderIds.filter(Boolean).map(String))];
      targetOrders = await db
        .select({
          id: orders.id,
          productId: orders.productId,
          status: orders.status,
        })
        .from(orders)
        .where(inArray(orders.id, uniqueIds));
    } else {
      return NextResponse.json(
        { success: false, error: "Pilih pesanan atau gunakan filter untuk hapus massal." },
        { status: 400 }
      );
    }

    if (targetOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: { deleted: 0 },
        message: "Tidak ada pesanan yang dihapus",
      });
    }

    const ids = targetOrders.map((order) => order.id);
    const voucherRows = [];

    for (const idChunk of chunk(ids)) {
      const rows = await db
        .select({
          productId: voucherCodes.productId,
        })
        .from(voucherCodes)
        .where(inArray(voucherCodes.orderId, idChunk));
      voucherRows.push(...rows);
    }

    const voucherProductIds = [
      ...new Set(
        [
          ...targetOrders.map((order) => order.productId),
          ...voucherRows.map((row) => row.productId),
        ].filter(Boolean)
      ),
    ];
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const idChunk of chunk(ids)) {
        await tx
          .update(voucherCodes)
          .set({
            status: "available",
            orderId: null,
            customerPhone: null,
            redeemResponse: null,
            updatedAt: now,
          })
          .where(
            and(
              inArray(voucherCodes.orderId, idChunk),
              eq(voucherCodes.status, "reserved")
            )
          );

        await tx
          .update(voucherCodes)
          .set({
            orderId: null,
            customerPhone: null,
            updatedAt: now,
          })
          .where(
            and(
              inArray(voucherCodes.orderId, idChunk),
              inArray(voucherCodes.status, ["redeemed", "failed"])
            )
          );

        await tx.delete(payments).where(inArray(payments.orderId, idChunk));
        await tx.delete(orders).where(inArray(orders.id, idChunk));
      }
    });

    for (const productId of voucherProductIds) {
      await syncVoucherProductStock(productId);
    }

    return NextResponse.json({
      success: true,
      data: { deleted: ids.length },
      message: `${ids.length} riwayat pesanan berhasil dihapus`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus riwayat pesanan" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/orders — Bulk update order statuses
export async function PUT(request) {
  try {
    const { orderIds, status } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || !status) {
      return NextResponse.json(
        { success: false, error: "orderIds (array) dan status wajib diisi" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "paid", "processing", "completed", "failed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status tidak valid" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let updated = 0;

    for (const orderId of orderIds) {
      const updates = { status, updatedAt: now };
      if (status === "completed") {
        updates.completedAt = now;
      }
      if (status === "paid" || status === "completed") {
        updates.paidAt = now;
      }

      await db
        .update(orders)
        .set(updates)
        .where(eq(orders.id, orderId));

      if (["paid", "processing", "completed"].includes(status)) {
        try {
          const [updatedOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

          if (updatedOrder) {
            await ensureVoucherFulfillment(
              updatedOrder,
              {
                sendWA: sendWhatsAppNotification,
                sendGroup: sendGroupNotification,
              },
              {
                sendVoucherMessage: true,
                retryFailedAutoRedeem: true,
                forceAutoRedeem: status === "processing" || status === "completed",
              }
            );
          }
        } catch (voucherErr) {
          console.error(`Bulk voucher fulfillment failed for ${orderId}:`, voucherErr.message);
        }
      }

      updated++;
    }

    return NextResponse.json({
      success: true,
      data: { updated, status },
    });
  } catch (error) {
    console.error("PUT /api/admin/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Bulk update failed" },
      { status: 500 }
    );
  }
}
