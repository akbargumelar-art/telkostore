import crypto from "crypto";

function getFirstDefinedEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminCredentialsConfig() {
  const username =
    getFirstDefinedEnv(["ADMIN_LOGIN_USER", "CONTROL_ADMIN_USER"]) || "admin";
  const email = getFirstDefinedEnv(["ADMIN_LOGIN_EMAIL", "CONTROL_ADMIN_EMAIL"]);
  const dedicatedPassword = getFirstDefinedEnv([
    "ADMIN_LOGIN_PASSWORD",
    "CONTROL_ADMIN_PASSWORD",
  ]);
  const password = dedicatedPassword || process.env.ADMIN_SECRET || "";

  return {
    username,
    email,
    password,
    hasDedicatedPassword: Boolean(dedicatedPassword),
    hasEmailIdentity: Boolean(email),
  };
}

export function hasAdminCredentialsConfigured() {
  const config = getAdminCredentialsConfig();
  return Boolean(config.username && config.password);
}

export function isValidAdminCredentials(identifier, password) {
  if (!identifier || !password) {
    return false;
  }

  const config = getAdminCredentialsConfig();

  if (!config.password) {
    return false;
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const allowedIdentifiers = [config.username, config.email]
    .filter(Boolean)
    .map((value) => value.trim().toLowerCase());

  if (!allowedIdentifiers.includes(normalizedIdentifier)) {
    return false;
  }

  return safeCompare(password, config.password);
}
