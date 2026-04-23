import crypto from "crypto";

const HASH_PREFIX = "scrypt";
const DEFAULT_ADMIN_USER_PASSWORD = "telko.store@2026";

export function getDefaultAdminUserPassword() {
  return process.env.ADMIN_DEFAULT_USER_PASSWORD || DEFAULT_ADMIN_USER_PASSWORD;
}

export function hashAdminUserPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyAdminUserPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== "string") {
    return false;
  }

  const [prefix, salt, expectedHash] = storedHash.split("$");

  if (prefix !== HASH_PREFIX || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const actualBuffer = Buffer.from(actualHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
