// GET /api/admin/orders — List all orders with pagination & filters
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders } from "@/db/schema.js";
import { eq, like, or, sql, desc } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

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

    let query = db.select().from(orders);

    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(sql`${conditions[0]} AND ${conditions[1]}`);
    }

    const result = await query
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total
    let countQuery = db.select({ total: sql`COUNT(*)` }).from(orders);
    if (conditions.length === 1) {
      countQuery = countQuery.where(conditions[0]);
    } else if (conditions.length > 1) {
      countQuery = countQuery.where(sql`${conditions[0]} AND ${conditions[1]}`);
    }
    const [{ total }] = await countQuery;

    return NextResponse.json({
      success: true,
      data: result,
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
