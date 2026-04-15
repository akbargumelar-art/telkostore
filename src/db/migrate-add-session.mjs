// Migration: Add session_name column to gateway_settings table
// Run with: node src/db/migrate-add-session.mjs

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../telko.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

console.log("🔧 Adding session_name column to gateway_settings...");

try {
  // Check if column already exists
  const tableInfo = db.pragma("table_info(gateway_settings)");
  const hasColumn = tableInfo.some((col) => col.name === "session_name");

  if (hasColumn) {
    console.log("✅ Column session_name already exists, skipping.");
  } else {
    db.exec("ALTER TABLE gateway_settings ADD COLUMN session_name TEXT;");
    console.log("✅ Column session_name added successfully.");
  }
} catch (err) {
  console.error("❌ Migration failed:", err.message);
} finally {
  db.close();
}
