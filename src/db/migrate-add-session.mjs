// Migration: Add session_name column to gateway_settings table (MySQL version)
// This migration is no longer needed — session_name is included in the MySQL schema.
// Kept for reference only.
//
// The MySQL schema already includes session_name in gateway_settings table.
// See: src/db/schema.js and src/db/mysql-init.sql
console.log("ℹ️  This migration is not needed for MySQL. session_name is already in the schema.");
console.log("   If upgrading from SQLite, run: npm run db:migrate-data");
