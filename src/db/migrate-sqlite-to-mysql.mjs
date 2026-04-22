// ==============================
// TELKO.STORE — Migrate Data from SQLite to MySQL
// Run: node src/db/migrate-sqlite-to-mysql.mjs
//
// Prerequisites:
//   1. MySQL database "telkostore" must exist
//   2. npm run db:seed (to create MySQL tables)
//   3. telko.db must exist in project root
//   4. better-sqlite3 must still be installed (npm i better-sqlite3 --save-dev)
//
// This script reads ALL data from SQLite and inserts into MySQL.
// It does NOT delete existing MySQL data — uses INSERT IGNORE to skip duplicates.
// ==============================

import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.join(__dirname, "../../telko.db");
const MYSQL_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

async function migrate() {
  console.log("🔄 Starting SQLite → MySQL data migration...");
  console.log(`   SQLite: ${SQLITE_PATH}`);
  console.log(`   MySQL: ${MYSQL_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  // Open SQLite
  let sqlite;
  try {
    sqlite = new Database(SQLITE_PATH, { readonly: true });
    sqlite.pragma("journal_mode = WAL");
  } catch (err) {
    console.error("❌ Cannot open SQLite database:", err.message);
    console.log("   Make sure telko.db exists in project root.");
    process.exit(1);
  }

  // Open MySQL
  const mysqlConn = await mysql.createConnection(MYSQL_URL);
  console.log("✅ Connected to both databases\n");

  // Disable foreign key checks during migration
  await mysqlConn.execute("SET FOREIGN_KEY_CHECKS = 0");

  // ===== 1. USERS =====
  try {
    const users = sqlite.prepare("SELECT * FROM users").all();
    console.log(`👤 Users: ${users.length} rows`);
    for (const u of users) {
      await mysqlConn.execute(
        `INSERT IGNORE INTO users (id, name, email, image, phone, provider, provider_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.image, u.phone, u.provider, u.provider_id, u.created_at]
      );
    }
    console.log(`   ✅ ${users.length} users migrated`);
  } catch (err) {
    console.log(`   ⚠️ Users table: ${err.message}`);
  }

  // ===== 2. CATEGORIES =====
  try {
    const categories = sqlite.prepare("SELECT * FROM categories").all();
    console.log(`📁 Categories: ${categories.length} rows`);
    for (const c of categories) {
      await mysqlConn.execute(
        `INSERT IGNORE INTO categories (id, name, icon, description, color, sort_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.icon, c.description, c.color, c.sort_order, Boolean(c.is_active), c.created_at]
      );
    }
    console.log(`   ✅ ${categories.length} categories migrated`);
  } catch (err) {
    console.log(`   ⚠️ Categories table: ${err.message}`);
  }

  // ===== 3. PRODUCTS =====
  try {
    const products = sqlite.prepare("SELECT * FROM products").all();
    console.log(`📦 Products: ${products.length} rows`);
    for (const p of products) {
      await mysqlConn.execute(
        `INSERT IGNORE INTO products (id, category_id, name, type, description, nominal, price, original_price, stock, validity, quota, game_name, game_icon, is_promo, is_flash_sale, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.category_id, p.name, p.type, p.description, p.nominal, p.price, p.original_price, p.stock, p.validity, p.quota, p.game_name, p.game_icon, Boolean(p.is_promo), Boolean(p.is_flash_sale), Boolean(p.is_active), p.created_at, p.updated_at]
      );
    }
    console.log(`   ✅ ${products.length} products migrated`);
  } catch (err) {
    console.log(`   ⚠️ Products table: ${err.message}`);
  }

  // ===== 4. ORDERS =====
  try {
    const orders = sqlite.prepare("SELECT * FROM orders").all();
    console.log(`🧾 Orders: ${orders.length} rows`);
    for (const o of orders) {
      await mysqlConn.execute(
        `INSERT IGNORE INTO orders (id, user_id, product_id, product_name, product_price, guest_phone, guest_token, target_data, status, payment_method, payment_gateway, snap_token, snap_redirect_url, midtrans_order_id, whatsapp_sent, notes, created_at, updated_at, paid_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.id, o.user_id || null, o.product_id, o.product_name, o.product_price, o.guest_phone, o.guest_token, o.target_data, o.status, o.payment_method, "midtrans", o.snap_token, o.snap_redirect_url, o.midtrans_order_id, Boolean(o.whatsapp_sent), o.notes, o.created_at, o.updated_at, o.paid_at, o.completed_at]
      );
    }
    console.log(`   ✅ ${orders.length} orders migrated`);
  } catch (err) {
    console.log(`   ⚠️ Orders table: ${err.message}`);
  }

  // ===== 5. PAYMENTS =====
  try {
    const payments = sqlite.prepare("SELECT * FROM payments").all();
    console.log(`💳 Payments: ${payments.length} rows`);
    for (const p of payments) {
      await mysqlConn.execute(
        `INSERT IGNORE INTO payments (id, order_id, gateway, payment_type, transaction_id, transaction_status, gross_amount, fraud_status, raw_response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.order_id, p.gateway || "midtrans", p.payment_type, p.transaction_id, p.transaction_status, p.gross_amount, p.fraud_status, p.raw_response, p.created_at]
      );
    }
    console.log(`   ✅ ${payments.length} payments migrated`);
  } catch (err) {
    console.log(`   ⚠️ Payments table: ${err.message}`);
  }

  // ===== 6. GATEWAY SETTINGS =====
  try {
    const settings = sqlite.prepare("SELECT * FROM gateway_settings").all();
    console.log(`⚙️ Gateway Settings: ${settings.length} rows`);
    for (const s of settings) {
      await mysqlConn.execute(
        `INSERT INTO gateway_settings (id, provider_name, server_key, client_key, api_url, session_name, is_production, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE server_key=VALUES(server_key), client_key=VALUES(client_key), api_url=VALUES(api_url), session_name=VALUES(session_name), is_production=VALUES(is_production), is_active=VALUES(is_active)`,
        [s.id, s.provider_name, s.server_key, s.client_key, s.api_url, s.session_name || null, Boolean(s.is_production), Boolean(s.is_active), s.created_at]
      );
    }
    console.log(`   ✅ ${settings.length} gateway settings migrated`);
  } catch (err) {
    console.log(`   ⚠️ Gateway Settings table: ${err.message}`);
  }

  // Re-enable foreign key checks
  await mysqlConn.execute("SET FOREIGN_KEY_CHECKS = 1");

  // ===== VERIFICATION =====
  console.log("\n📊 Verification — Row counts:");

  const tables = ["users", "categories", "products", "orders", "payments", "gateway_settings"];
  for (const table of tables) {
    let sqliteCount = 0;
    try { sqliteCount = sqlite.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c; } catch { /* table may not exist */ }
    const [[{ c: mysqlCount }]] = await mysqlConn.execute(`SELECT COUNT(*) as c FROM ${table}`);
    const match = sqliteCount === Number(mysqlCount) ? "✅" : "⚠️";
    console.log(`   ${match} ${table}: SQLite=${sqliteCount} → MySQL=${mysqlCount}`);
  }

  sqlite.close();
  await mysqlConn.end();

  console.log("\n🎉 Migration complete!");
  console.log("💡 telko.db has NOT been deleted (backup preserved).");
  console.log("💡 Verify your app works, then you can safely archive telko.db.\n");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
