import crypto from "crypto";

import {
  hashAdminUserPassword,
  verifyAdminUserPassword,
} from "@/lib/admin-user-password";

const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function hashPassword(password) {
  return hashAdminUserPassword(password);
}

export function verifyPassword(password, storedHash) {
  return verifyAdminUserPassword(password, storedHash);
}

export function generateTemporaryPassword(length = 10) {
  const size = Math.max(8, Number(length) || 10);
  const bytes = crypto.randomBytes(size);

  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join("");
}
