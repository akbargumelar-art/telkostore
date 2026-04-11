// GET/DELETE /api/admin/users/[id]
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users, orders } from "@/db/schema.js";
import { eq, desc } from "drizzle-orm";

// GET — User detail + orders
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's orders
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      data: { ...user, orders: userOrders },
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// DELETE — Remove user
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "User deleted",
    });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
