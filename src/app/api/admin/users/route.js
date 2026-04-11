// GET /api/admin/users — List users + search
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { like, or, desc } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = db.select().from(users);

    if (search) {
      query = query.where(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    const result = await query.orderBy(desc(users.createdAt)).limit(100);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
