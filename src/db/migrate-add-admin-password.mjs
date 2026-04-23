// ==============================
// TELKO.STORE - Migration: Add password_hash column to users
// Run: node src/db/migrate-add-admin-password.mjs
// ==============================

import crypto from "crypto";
import mysql from "mysql2/promise";

const DATABASE_URL =
  process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";
const DEFAULT_ADMIN_USER_PASSWORD =
  process.env.ADMIN_DEFAULT_USER_PASSWORD || "telko.store@2026";

function hashAdminUserPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log("Adding 'password_hash' column to users table if needed...");

  try {
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'`
    );

    if (columns.length === 0) {
      await connection.execute(
        `ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER role`
      );
      console.log("Column 'password_hash' added.");
    } else {
      console.log("Column 'password_hash' already exists, skipping add.");
    }

    const [admins] = await connection.execute(
      `SELECT id FROM users
       WHERE role = 'admin' AND (password_hash IS NULL OR password_hash = '')`
    );

    if (admins.length === 0) {
      console.log("No admin users need password backfill.");
    } else {
      for (const admin of admins) {
        const passwordHash = hashAdminUserPassword(DEFAULT_ADMIN_USER_PASSWORD);
        await connection.execute(
          `UPDATE users SET password_hash = ? WHERE id = ?`,
          [passwordHash, admin.id]
        );
      }

      console.log(
        `Backfilled default password for ${admins.length} admin user(s).`
      );
    }
  } catch (error) {
    console.error("Migration failed:", error.message);
    throw error;
  }

  await connection.end();
  console.log("Admin password migration complete.");
}

migrate().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
