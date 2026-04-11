// GET /api/user/orders — Get orders for logged-in user (by email/phone)
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/db/index.js";
import { orders } from "@/db/schema.js";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get orders linked to this user (by userId)
    // Also get orders by phone/email if user has phone set
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, session.user.id))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    return NextResponse.json({ success: true, data: userOrders });
  } catch (error) {
    console.error("GET /api/user/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
