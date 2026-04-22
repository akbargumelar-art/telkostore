// ==============================
// TELKO.STORE — Database Connection
// mysql2 + Drizzle ORM
// ==============================

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";

let _pool = null;
let _db = null;

function getConnection() {
  if (!_db) {
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Ensure proper timezone and charset
      timezone: "+00:00",
      charset: "utf8mb4",
      // Auto-reconnect on connection loss
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Handle pool errors (disconnect, timeout, etc.)
    _pool.on("error", (err) => {
      console.error("❌ MySQL pool error:", err.message);
      // Force reconnect on next query
      _db = null;
      _pool = null;
    });

    _db = drizzle(_pool, { schema, mode: "default" });
  }
  return _db;
}

// Use Proxy to always delegate to getConnection() on every property access.
// This ensures that if pool error resets _db to null, the next DB operation
// will transparently create a fresh connection instead of using a stale ref.
const db = new Proxy({}, {
  get(_target, prop) {
    const instance = getConnection();
    const value = instance[prop];
    // Bind methods so `this` points to the real drizzle instance
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { db };
export default db;
