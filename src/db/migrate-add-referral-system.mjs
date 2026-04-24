import mysql from "mysql2/promise";

const DATABASE_URL =
  process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function hasIndex(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?`,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function ensureColumn(connection, tableName, columnName, definition, label) {
  if (await hasColumn(connection, tableName, columnName)) {
    console.log(`Column '${tableName}.${columnName}' already exists, skipping.`);
    return;
  }

  await connection.execute(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
  );
  console.log(`Added column '${tableName}.${columnName}' (${label || definition}).`);
}

async function ensureIndex(connection, tableName, indexName, definitionSql) {
  if (await hasIndex(connection, tableName, indexName)) {
    console.log(`Index '${indexName}' already exists on ${tableName}, skipping.`);
    return;
  }

  await connection.execute(`ALTER TABLE ${tableName} ADD ${definitionSql}`);
  console.log(`Added index '${indexName}' on ${tableName}.`);
}

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Preparing referral system tables...");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS downline_profiles (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(120) NOT NULL UNIQUE,
        custom_referral_alias VARCHAR(120) UNIQUE,
        is_custom_referral_active BOOLEAN DEFAULT FALSE,
        display_name VARCHAR(255) NOT NULL,
        margin_per_transaction DOUBLE NOT NULL DEFAULT 0,
        is_referral_active BOOLEAN DEFAULT TRUE,
        banner_title VARCHAR(255),
        banner_subtitle TEXT,
        banner_image_url TEXT,
        theme_key VARCHAR(40) NOT NULL DEFAULT 'sunrise',
        promo_redirect_path VARCHAR(255) NOT NULL DEFAULT '/',
        created_at VARCHAR(50),
        updated_at VARCHAR(50),
        CONSTRAINT fk_downline_profiles_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id VARCHAR(100) PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL UNIQUE,
        downline_user_id VARCHAR(100) NOT NULL,
        downline_profile_id VARCHAR(100) NOT NULL,
        downline_slug_snapshot VARCHAR(120) NOT NULL,
        downline_custom_alias_snapshot VARCHAR(120),
        downline_display_name_snapshot VARCHAR(255),
        commission_amount DOUBLE NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        status_reason TEXT,
        tracked_at VARCHAR(50),
        approved_at VARCHAR(50),
        paid_at VARCHAR(50),
        created_at VARCHAR(50),
        updated_at VARCHAR(50),
        CONSTRAINT fk_referral_commissions_order
          FOREIGN KEY (order_id) REFERENCES orders(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_referral_commissions_user
          FOREIGN KEY (downline_user_id) REFERENCES users(id)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_referral_commissions_profile
          FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS referral_clicks (
        id VARCHAR(100) PRIMARY KEY,
        downline_profile_id VARCHAR(100) NOT NULL,
        slug VARCHAR(120) NOT NULL,
        custom_alias VARCHAR(120),
        ip_hash VARCHAR(128) NOT NULL,
        user_agent TEXT,
        landing_path VARCHAR(255),
        created_at VARCHAR(50),
        CONSTRAINT fk_referral_clicks_profile
          FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await ensureColumn(
      connection,
      "orders",
      "downline_user_id",
      "VARCHAR(100) NULL AFTER notes",
      "FK ke users.id"
    );
    await ensureColumn(
      connection,
      "orders",
      "downline_profile_id",
      "VARCHAR(100) NULL AFTER downline_user_id",
      "FK ke downline_profiles.id"
    );
    await ensureColumn(
      connection,
      "orders",
      "downline_slug",
      "VARCHAR(120) NULL AFTER downline_profile_id"
    );
    await ensureColumn(
      connection,
      "orders",
      "downline_custom_alias",
      "VARCHAR(120) NULL AFTER downline_slug"
    );
    await ensureColumn(
      connection,
      "orders",
      "downline_display_name",
      "VARCHAR(255) NULL AFTER downline_custom_alias"
    );
    await ensureColumn(
      connection,
      "orders",
      "downline_margin_snapshot",
      "DOUBLE NULL AFTER downline_display_name"
    );
    await ensureColumn(
      connection,
      "orders",
      "referral_source",
      "VARCHAR(40) NULL AFTER downline_margin_snapshot"
    );
    await ensureColumn(
      connection,
      "orders",
      "referral_attributed_at",
      "VARCHAR(50) NULL AFTER referral_source"
    );

    await ensureIndex(
      connection,
      "orders",
      "idx_orders_downline_profile",
      "INDEX idx_orders_downline_profile (downline_profile_id)"
    );
    await ensureIndex(
      connection,
      "orders",
      "idx_orders_referral_source",
      "INDEX idx_orders_referral_source (referral_source)"
    );
    await ensureIndex(
      connection,
      "referral_commissions",
      "idx_referral_commissions_profile_status",
      "INDEX idx_referral_commissions_profile_status (downline_profile_id, status)"
    );
    await ensureIndex(
      connection,
      "referral_clicks",
      "idx_referral_clicks_profile_created",
      "INDEX idx_referral_clicks_profile_created (downline_profile_id, created_at)"
    );

    console.log("Referral system migration complete.");
  } catch (error) {
    console.error("Referral system migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
