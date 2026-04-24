// ==============================
// TELKO.STORE - Migration: Add site banner management table
// Run: node src/db/migrate-add-site-banners.mjs
// ==============================

import mysql from "mysql2/promise";
import { DEFAULT_SITE_BANNERS } from "../lib/site-banners.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

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
    console.log("Preparing site_banners table...");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS site_banners (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        cta_text VARCHAR(100) NOT NULL,
        cta_type VARCHAR(20) DEFAULT 'link',
        cta_link VARCHAR(500),
        category_id VARCHAR(100),
        background_style TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    if (
      !(await indexExists(
        connection,
        "site_banners",
        "idx_site_banners_active_order"
      ))
    ) {
      await connection.execute(
        `ALTER TABLE site_banners
         ADD INDEX idx_site_banners_active_order (is_active, sort_order)`
      );
      console.log("Added index idx_site_banners_active_order");
    }

    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM site_banners"
    );
    const total = Number(rows[0]?.total || 0);

    if (total === 0) {
      console.log("Seeding default homepage banners...");
      const now = new Date().toISOString();

      for (const banner of DEFAULT_SITE_BANNERS) {
        await connection.execute(
          `INSERT INTO site_banners
           (id, title, subtitle, cta_text, cta_type, cta_link, category_id, background_style, sort_order, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            banner.id,
            banner.title,
            banner.subtitle,
            banner.ctaText,
            banner.ctaType,
            banner.ctaLink || null,
            banner.categoryId || null,
            banner.backgroundStyle,
            banner.sortOrder,
            banner.isActive,
            now,
            now,
          ]
        );
      }

      console.log(`Inserted ${DEFAULT_SITE_BANNERS.length} default banner(s).`);
    } else {
      console.log("site_banners already has data, skipping seed.");
    }

    console.log("Site banner migration complete.");
  } catch (error) {
    console.error("Site banner migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
