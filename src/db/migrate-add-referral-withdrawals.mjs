import mysql from "mysql2/promise";
import "dotenv/config";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  console.log("Adding withdrawal_id to referral_commissions...");
  try {
    await connection.query(`
      ALTER TABLE referral_commissions
      ADD COLUMN withdrawal_id VARCHAR(100) DEFAULT NULL;
    `);
    console.log("withdrawal_id added.");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("withdrawal_id already exists.");
    } else {
      console.error(err);
    }
  }

  console.log("Creating referral_withdrawals table...");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS referral_withdrawals (
      id VARCHAR(100) PRIMARY KEY,
      downline_profile_id VARCHAR(100) NOT NULL,
      amount DOUBLE NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      account_number VARCHAR(100) NOT NULL,
      account_name VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      admin_notes TEXT,
      processed_at VARCHAR(50),
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id)
    );
  `);
  console.log("referral_withdrawals created.");

  console.log("Done.");
  process.exit(0);
}

run();
