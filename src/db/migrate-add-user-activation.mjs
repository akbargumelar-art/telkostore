import db from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding 'activation_token' and 'email_verified' columns to users table if needed...");
  
  const addActivationToken = `
    ALTER TABLE users
    ADD COLUMN activation_token VARCHAR(255) DEFAULT NULL;
  `;
  const addEmailVerified = `
    ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
  `;
  
  try {
    await db.execute(sql.raw(addActivationToken));
    console.log("Column 'activation_token' added.");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Column 'activation_token' already exists, skipping add.");
    } else {
      throw err;
    }
  }

  try {
    await db.execute(sql.raw(addEmailVerified));
    console.log("Column 'email_verified' added.");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Column 'email_verified' already exists, skipping add.");
    } else {
      throw err;
    }
  }
  
  console.log("User activation migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
