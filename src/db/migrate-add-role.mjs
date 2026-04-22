// ==============================
// TELKO.STORE — Migration: Add role column to users
// Run: node src/db/migrate-add-role.mjs
// ==============================

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log("🔧 Adding 'role' column to users table...");

  try {
    // Check if column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    );

    if (columns.length > 0) {
      console.log("✅ Column 'role' already exists, skipping.");
    } else {
      await connection.execute(
        `ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER phone`
      );
      console.log("✅ Column 'role' added successfully!");
    }
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    throw err;
  }

  await connection.end();
  console.log("🎉 Migration complete!");
}

migrate().catch((err) => {
  console.error("❌ Migration script failed:", err);
  process.exit(1);
});
