const DUITKU_PRODUCTION_SCRIPT = "https://app-prod.duitku.com/lib/js/duitku.js";
const DUITKU_SANDBOX_SCRIPT = "https://app-sandbox.duitku.com/lib/js/duitku.js";

let duitkuScriptPromise = null;

function getCheckoutModule() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.checkout && typeof window.checkout.process === "function") {
    return window.checkout;
  }

  return null;
}

export function extractDuitkuReference(paymentUrl = "") {
  if (!paymentUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(paymentUrl);
    return parsedUrl.searchParams.get("reference") || "";
  } catch {
    return "";
  }
}

export function getDuitkuScriptUrl({ isProduction = false, paymentUrl = "" } = {}) {
  if (String(paymentUrl).includes("app-prod.duitku.com")) {
    return DUITKU_PRODUCTION_SCRIPT;
  }

  if (String(paymentUrl).includes("app-sandbox.duitku.com")) {
    return DUITKU_SANDBOX_SCRIPT;
  }

  return isProduction ? DUITKU_PRODUCTION_SCRIPT : DUITKU_SANDBOX_SCRIPT;
}

export async function loadDuitkuScript(options = {}) {
  const existingCheckout = getCheckoutModule();
  if (existingCheckout) {
    return existingCheckout;
  }

  const scriptSrc = getDuitkuScriptUrl(options);
  if (!scriptSrc) {
    throw new Error("Script Duitku tidak ditemukan.");
  }

  if (!duitkuScriptPromise) {
    duitkuScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(getCheckoutModule()));
        existingScript.addEventListener("error", () => reject(new Error("Gagal memuat script Duitku.")));
        return;
      }

      const script = document.createElement("script");
      script.src = scriptSrc;
      script.async = true;
      script.onload = () => {
        const checkout = getCheckoutModule();
        if (!checkout) {
          reject(new Error("Modul popup Duitku tidak tersedia setelah script dimuat."));
          return;
        }

        resolve(checkout);
      };
      script.onerror = () => reject(new Error("Gagal memuat script Duitku."));
      document.head.appendChild(script);
    }).catch((error) => {
      duitkuScriptPromise = null;
      throw error;
    });
  }

  return duitkuScriptPromise;
}

export async function openDuitkuPopup({
  reference,
  paymentUrl,
  isProduction = false,
  onSuccess,
  onPending,
  onError,
  onClose,
} = {}) {
  const duitkuReference = reference || extractDuitkuReference(paymentUrl);

  if (!duitkuReference) {
    throw new Error("Reference Duitku tidak ditemukan.");
  }

  const checkout = await loadDuitkuScript({ isProduction, paymentUrl });

  checkout.process(duitkuReference, {
    defaultLanguage: "id",
    successEvent(result) {
      onSuccess?.(result);
    },
    pendingEvent(result) {
      onPending?.(result);
    },
    errorEvent(result) {
      onError?.(result);
    },
    closeEvent(result) {
      onClose?.(result);
    },
  });
}
