import db from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding bank account columns to downline_profiles table if needed...");
  
  const alterStatements = [
    {
      column: "bank_name",
      sqlQuery: "ALTER TABLE downline_profiles ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL;",
    },
    {
      column: "bank_account_number",
      sqlQuery: "ALTER TABLE downline_profiles ADD COLUMN bank_account_number VARCHAR(100) DEFAULT NULL;",
    },
    {
      column: "bank_account_name",
      sqlQuery: "ALTER TABLE downline_profiles ADD COLUMN bank_account_name VARCHAR(255) DEFAULT NULL;",
    },
  ];

  for (const { column, sqlQuery } of alterStatements) {
    try {
      await db.execute(sql.raw(sqlQuery));
      console.log(`Column '${column}' added.`);
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log(`Column '${column}' already exists, skipping add.`);
      } else {
        throw err;
      }
    }
  }

  console.log("Bank account migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
