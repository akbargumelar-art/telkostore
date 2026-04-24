// ==============================
// TELKO.STORE - Migration: Add Digiflazz schema support
// Run: node src/db/migrate-add-digiflazz.mjs
// ==============================

import mysql from "mysql2/promise";

const DATABASE_URL =
  process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Preparing Digiflazz columns on products table...");

    if (!(await columnExists(connection, "products", "supplier_name"))) {
      await connection.execute(
        `ALTER TABLE products
         ADD COLUMN supplier_name VARCHAR(50) NULL AFTER game_icon`
      );
      console.log("Added products.supplier_name");
    }

    if (!(await columnExists(connection, "products", "supplier_sku_code"))) {
      await connection.execute(
        `ALTER TABLE products
         ADD COLUMN supplier_sku_code VARCHAR(100) NULL AFTER supplier_name`
      );
      console.log("Added products.supplier_sku_code");
    }

    if (!(await columnExists(connection, "products", "is_digiflazz_enabled"))) {
      await connection.execute(
        `ALTER TABLE products
         ADD COLUMN is_digiflazz_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER supplier_sku_code`
      );
      console.log("Added products.is_digiflazz_enabled");
    }

    console.log("Preparing digiflazz_transactions table...");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS digiflazz_transactions (
        id VARCHAR(100) PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        ref_id VARCHAR(100) NOT NULL,
        buyer_sku_code VARCHAR(100) NOT NULL,
        customer_no VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL,
        message TEXT,
        sn TEXT,
        buyer_last_saldo DOUBLE,
        raw_request TEXT,
        raw_response TEXT,
        created_at VARCHAR(50),
        updated_at VARCHAR(50),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    if (!(await indexExists(connection, "digiflazz_transactions", "uq_digiflazz_ref"))) {
      await connection.execute(
        `ALTER TABLE digiflazz_transactions
         ADD UNIQUE INDEX uq_digiflazz_ref (ref_id)`
      );
      console.log("Added unique index uq_digiflazz_ref");
    }

    if (!(await indexExists(connection, "digiflazz_transactions", "idx_digiflazz_order"))) {
      await connection.execute(
        `ALTER TABLE digiflazz_transactions
         ADD INDEX idx_digiflazz_order (order_id)`
      );
      console.log("Added index idx_digiflazz_order");
    }

    if (!(await indexExists(connection, "digiflazz_transactions", "idx_digiflazz_status"))) {
      await connection.execute(
        `ALTER TABLE digiflazz_transactions
         ADD INDEX idx_digiflazz_status (status)`
      );
      console.log("Added index idx_digiflazz_status");
    }

    console.log("Digiflazz migration complete.");
  } catch (error) {
    console.error("Digiflazz migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
