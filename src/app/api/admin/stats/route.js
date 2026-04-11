// GET /api/admin/stats — Dashboard statistics
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, products, categories } from "@/db/schema.js";
import { eq, sql, count, sum, and, gte } from "drizzle-orm";

export async function GET() {
  try {
    // Total products
    const [productStats] = await db
      .select({ total: count(), active: sum(sql`CASE WHEN ${products.isActive} = 1 THEN 1 ELSE 0 END`) })
      .from(products);

    // Total categories  
    const [categoryStats] = await db
      .select({ total: count() })
      .from(categories)
      .where(eq(categories.isActive, true));

    // Order statistics
    const orderStats = await db
      .select({
        status: orders.status,
        count: count(),
        revenue: sum(orders.productPrice),
      })
      .from(orders)
      .groupBy(orders.status);

    const totalOrders = orderStats.reduce((acc, s) => acc + Number(s.count), 0);
    const totalRevenue = orderStats
      .filter((s) => s.status === "completed" || s.status === "paid")
      .reduce((acc, s) => acc + Number(s.revenue || 0), 0);
    const pendingOrders = orderStats.find((s) => s.status === "pending")?.count || 0;
    const completedOrders = orderStats.find((s) => s.status === "completed")?.count || 0;
    const failedOrders = orderStats.find((s) => s.status === "failed")?.count || 0;

    // Today's stats
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = await db
      .select({ count: count(), revenue: sum(orders.productPrice) })
      .from(orders)
      .where(gte(orders.createdAt, today));

    // Recent orders (last 10)
    const recentOrders = await db
      .select({
        id: orders.id,
        productName: orders.productName,
        productPrice: orders.productPrice,
        guestPhone: orders.guestPhone,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        products: {
          total: Number(productStats.total),
          active: Number(productStats.active || 0),
        },
        categories: { total: Number(categoryStats.total) },
        orders: {
          total: totalOrders,
          pending: Number(pendingOrders),
          completed: Number(completedOrders),
          failed: Number(failedOrders),
        },
        revenue: {
          total: totalRevenue,
          today: Number(todayOrders[0]?.revenue || 0),
          todayOrders: Number(todayOrders[0]?.count || 0),
        },
        recentOrders,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
