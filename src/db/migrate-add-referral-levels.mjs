import mysql from "mysql2/promise";

const DATABASE_URL =
  process.env.DATABASE_URL || "mysql://root:password@localhost:3306/telkostore";

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
    console.log("Preparing referral level tables...");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS referral_level_rules (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        min_transactions INT NOT NULL DEFAULT 0,
        max_transactions INT NULL,
        commission_amount DOUBLE NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS referral_monthly_levels (
        id VARCHAR(100) PRIMARY KEY,
        downline_profile_id VARCHAR(100) NOT NULL,
        period_month VARCHAR(7) NOT NULL,
        basis_period_month VARCHAR(7) NOT NULL,
        total_transactions INT NOT NULL DEFAULT 0,
        current_month_transactions INT NOT NULL DEFAULT 0,
        applied_level_rule_id VARCHAR(100) NULL,
        applied_level_name VARCHAR(100) NULL,
        applied_commission_amount DOUBLE NOT NULL DEFAULT 0,
        uses_legacy_margin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at VARCHAR(50),
        updated_at VARCHAR(50),
        CONSTRAINT fk_referral_monthly_levels_profile
          FOREIGN KEY (downline_profile_id) REFERENCES downline_profiles(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_referral_monthly_levels_rule
          FOREIGN KEY (applied_level_rule_id) REFERENCES referral_level_rules(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await ensureIndex(
      connection,
      "referral_level_rules",
      "idx_referral_level_rules_active_sort",
      "INDEX idx_referral_level_rules_active_sort (is_active, sort_order)"
    );
    await ensureIndex(
      connection,
      "referral_monthly_levels",
      "uq_referral_monthly_levels_profile_period",
      "UNIQUE INDEX uq_referral_monthly_levels_profile_period (downline_profile_id, period_month)"
    );
    await ensureIndex(
      connection,
      "referral_monthly_levels",
      "idx_referral_monthly_levels_period",
      "INDEX idx_referral_monthly_levels_period (period_month)"
    );

    const [[{ totalRules }]] = await connection.execute(
      "SELECT COUNT(*) AS totalRules FROM referral_level_rules"
    );

    if (Number(totalRules || 0) === 0) {
      const now = new Date().toISOString();
      const defaultRules = [
        ["RLR-BRONZE", "Bronze", 0, 20, 100, 1, true, now, now],
        ["RLR-SILVER", "Silver", 21, 50, 150, 2, true, now, now],
        ["RLR-GOLD", "Gold", 51, null, 200, 3, true, now, now],
      ];

      for (const rule of defaultRules) {
        await connection.execute(
          `INSERT INTO referral_level_rules (
            id,
            name,
            min_transactions,
            max_transactions,
            commission_amount,
            sort_order,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          rule
        );
      }

      console.log("Seeded default referral level rules.");
    } else {
      console.log("Referral level rules already exist, skipping default seed.");
    }

    console.log("Referral level migration complete.");
  } catch (error) {
    console.error("Referral level migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
