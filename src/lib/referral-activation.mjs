const ACTIVATION_LINK_EXPIRY_DAYS = 7;
const ACTIVATION_LINK_EXPIRY_MS =
  ACTIVATION_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function parseIsoDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function createActivationExpiryIso(baseIso = new Date().toISOString()) {
  const baseDate = parseIsoDate(baseIso) || new Date();
  return new Date(baseDate.getTime() + ACTIVATION_LINK_EXPIRY_MS).toISOString();
}

export function evaluateReferralActivation(user = {}) {
  const hasActivationToken = Boolean(user.activationToken);
  const expiresAt = parseIsoDate(user.activationTokenExpiresAt);
  const isExpired = Boolean(
    hasActivationToken && expiresAt && expiresAt.getTime() <= Date.now()
  );

  return {
    hasActivationToken,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    isExpired,
    isVerified: Boolean(user.emailVerified),
    canLogin: !hasActivationToken,
    requiresActivation: hasActivationToken,
  };
}

export function isExistingUserRoleAllowedForReferral(role) {
  return !role || role === "user" || role === "downline";
}

export function buildNotificationDeliverySummary({
  emailSent = false,
  whatsappSent = false,
  hasPhone = false,
} = {}) {
  let state = "failed";
  let message = "Link aktivasi belum berhasil dikirim";

  if (emailSent && whatsappSent) {
    state = "sent_all";
    message = "Link aktivasi berhasil dikirim via Email dan WhatsApp";
  } else if (emailSent && !hasPhone) {
    state = "sent_email_only";
    message = "Link aktivasi berhasil dikirim via Email";
  } else if (emailSent) {
    state = "partial";
    message = "Link aktivasi berhasil dikirim via Email, tetapi WhatsApp gagal dikirim";
  } else if (whatsappSent) {
    state = "partial";
    message = "Link aktivasi berhasil dikirim via WhatsApp, tetapi Email gagal dikirim";
  } else if (hasPhone) {
    message = "Link aktivasi gagal dikirim via Email dan WhatsApp";
  } else {
    message = "Link aktivasi gagal dikirim via Email";
  }

  return {
    state,
    message,
    emailSent: Boolean(emailSent),
    whatsappSent: Boolean(whatsappSent),
    hasPhone: Boolean(hasPhone),
  };
}

export function resolveActivationLinkState(payload) {
  if (payload?.valid) {
    return "valid";
  }

  if (payload?.expired) {
    return "expired";
  }

  if (payload?.used) {
    return "redirect_login";
  }

  if (
    typeof payload?.error === "string" &&
    /tidak ditemukan|sudah digunakan/i.test(payload.error)
  ) {
    return "redirect_login";
  }

  return "valid";
}

export function resolveMitraLoginNotice(status) {
  if (status === "done") {
    return {
      tone: "success",
      message: "Aktivasi berhasil. Silakan login menggunakan email referral dan password baru Anda.",
    };
  }

  if (status === "expired") {
    return {
      tone: "warning",
      message: "Link aktivasi sudah kadaluarsa. Silakan minta admin mengirim ulang aktivasi.",
    };
  }

  return null;
}
