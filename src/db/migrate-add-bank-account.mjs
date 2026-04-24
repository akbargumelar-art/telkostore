// ==============================
// Migration: Add bank account fields to downline_profiles
// Run: node src/db/migrate-add-bank-account.mjs
// ==============================

import { createPool } from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

async function migrate() {
  const pool = createPool(DATABASE_URL);

  const alterStatements = [
    {
      column: "bank_name",
      sql: "ALTER TABLE downline_profiles ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL",
    },
    {
      column: "bank_account_number",
      sql: "ALTER TABLE downline_profiles ADD COLUMN bank_account_number VARCHAR(100) DEFAULT NULL",
    },
    {
      column: "bank_account_name",
      sql: "ALTER TABLE downline_profiles ADD COLUMN bank_account_name VARCHAR(255) DEFAULT NULL",
    },
  ];

  for (const { column, sql } of alterStatements) {
    try {
      await pool.query(sql);
      console.log(`✅ Column '${column}' added to downline_profiles`);
    } catch (error) {
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log(`⏭️  Column '${column}' already exists — skipping`);
      } else {
        console.error(`❌ Failed to add '${column}':`, error.message);
      }
    }
  }

  await pool.end();
  console.log("\n✅ Migration complete: bank account fields");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
