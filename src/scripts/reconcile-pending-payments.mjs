import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;

  const content = fs.readFileSync(filepath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadProjectEnv() {
  const rootDir = process.cwd();
  const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];

  for (const filename of envFiles) {
    loadEnvFile(path.join(rootDir, filename));
  }
}

function parseLimitArg() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) return undefined;

  const parsed = Number(limitArg.split("=")[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

loadProjectEnv();

const { reconcilePendingOrdersBatch } = await import("../lib/payment-reconciliation.js");

const limit =
  parseLimitArg() ||
  (Number.isFinite(Number(process.env.PAYMENT_RECONCILE_BATCH))
    ? Number(process.env.PAYMENT_RECONCILE_BATCH)
    : undefined);
const startedAt = Date.now();

try {
  const summary = await reconcilePendingOrdersBatch({
    limit,
    ignoreThrottle: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        durationMs: Date.now() - startedAt,
        ...summary,
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        durationMs: Date.now() - startedAt,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
}
