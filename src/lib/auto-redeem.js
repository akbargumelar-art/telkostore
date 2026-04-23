// ==============================
// TELKO.STORE — Auto-Redeem Engine (Puppeteer)
// Automates voucher redemption on Telkomsel & byU websites
// Falls back to semi-auto if automation fails
// ==============================

// Puppeteer is loaded dynamically to avoid breaking builds
let _puppeteer = null;
let _puppeteerLoaded = false;

async function loadPuppeteer() {
  if (_puppeteerLoaded) return _puppeteer;
  _puppeteerLoaded = true;
  try {
    _puppeteer = (await import("puppeteer")).default;
  } catch {
    _puppeteer = null;
  }
  return _puppeteer;
}

const REDEEM_URLS = {
  simpati: "https://www.telkomsel.com/shops/voucher/redeem",
  byu: "https://pidaw-webfront.cx.byu.id/web/tkr-voucher",
};

// Timeouts
const PAGE_LOAD_TIMEOUT = 30_000;
const INPUT_DELAY = 100; // ms between keystrokes (human-like)
const SUBMIT_WAIT = 10_000; // wait for response after submit
const MAX_RETRIES = 2;

/**
 * Check if Puppeteer is available
 */
export async function isPuppeteerAvailable() {
  const pup = await loadPuppeteer();
  return pup !== null;
}

/**
 * Auto-redeem a voucher code on the provider's website
 * 
 * @param {string} provider - "simpati" or "byu"
 * @param {string} code - Voucher code (16-17 digits)
 * @param {string} phone - Target phone number (08xxx format)
 * @param {number} [retryCount=0] - Internal retry counter
 * @returns {Promise<{ success: boolean, message: string, fallback?: boolean }>}
 */
export async function autoRedeemVoucher(provider, code, phone, retryCount = 0) {
  const puppeteer = await loadPuppeteer();

  if (!puppeteer) {
    return {
      success: false,
      message: "Puppeteer not installed — falling back to semi-auto",
      fallback: true,
    };
  }

  if (!provider || !code || !phone) {
    return {
      success: false,
      message: "Missing required parameters (provider, code, phone)",
      fallback: true,
    };
  }

  // Normalize phone: ensure 08xxx format
  const normalizedPhone = phone.replace(/^(\+62|62)/, "0").replace(/\D/g, "");

  console.log(`🤖 Auto-redeem starting: provider=${provider}, phone=${normalizedPhone}, code=${code.substring(0, 4)}****`);

  let browser = null;

  try {
    // Launch headless Chrome
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--window-size=1024,768",
      ],
      timeout: PAGE_LOAD_TIMEOUT,
    });

    let result;

    if (provider === "byu") {
      result = await redeemByU(browser, normalizedPhone, code);
    } else {
      // Default: Telkomsel/Simpati
      result = await redeemTelkomsel(browser, normalizedPhone, code);
    }

    return result;
  } catch (err) {
    console.error(`❌ Auto-redeem error (attempt ${retryCount + 1}):`, err.message);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying auto-redeem (${retryCount + 1}/${MAX_RETRIES})...`);
      if (browser) {
        try { await browser.close(); } catch {}
      }
      // Wait a bit before retry
      await new Promise((r) => setTimeout(r, 2000));
      return autoRedeemVoucher(provider, code, phone, retryCount + 1);
    }

    return {
      success: false,
      message: `Auto-redeem failed after ${MAX_RETRIES + 1} attempts: ${err.message}`,
      fallback: true,
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

/**
 * Redeem on Telkomsel website
 * URL: https://www.telkomsel.com/shops/voucher/redeem
 * 
 * Form fields:
 *   - Phone: input[placeholder="Masukan Nomor Telkomsel Anda"] or input[aria-label="MSISDN"]
 *   - Voucher: input[placeholder="Masukkan Kode Voucher"]
 *   - Submit: button.btn-primary-submit (text "Redeem")
 */
async function redeemTelkomsel(browser, phone, code) {
  const page = await browser.newPage();
  
  // Set viewport and user agent
  await page.setViewport({ width: 1024, height: 768 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  console.log("📱 Navigating to Telkomsel redeem page...");
  await page.goto(REDEEM_URLS.simpati, {
    waitUntil: "networkidle2",
    timeout: PAGE_LOAD_TIMEOUT,
  });

  // Wait for Angular SPA to render the form
  console.log("⏳ Waiting for form to load...");
  
  // Try multiple selectors for phone input
  const phoneSelectors = [
    'input[aria-label="MSISDN"]',
    'input[placeholder="Masukan Nomor Telkomsel Anda"]',
    'input[formcontrolname="msisdn"]',
    'input[type="tel"]',
  ];

  let phoneInput = null;
  for (const sel of phoneSelectors) {
    try {
      phoneInput = await page.waitForSelector(sel, { timeout: 10_000 });
      if (phoneInput) {
        console.log(`✅ Phone input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!phoneInput) {
    return {
      success: false,
      message: "Telkomsel: Phone input field not found — page structure may have changed",
      fallback: true,
    };
  }

  // Type phone number
  await phoneInput.click({ clickCount: 3 }); // select all existing text
  await phoneInput.type(phone, { delay: INPUT_DELAY });
  console.log(`📞 Phone entered: ${phone}`);

  // Wait a moment for validation
  await new Promise((r) => setTimeout(r, 1000));

  // Find voucher code input
  const voucherSelectors = [
    'input[placeholder="Masukkan Kode Voucher"]',
    'input[formcontrolname="voucher"]',
    'input[aria-label="Voucher"]',
  ];

  let voucherInput = null;
  for (const sel of voucherSelectors) {
    try {
      voucherInput = await page.waitForSelector(sel, { timeout: 5_000 });
      if (voucherInput) {
        console.log(`✅ Voucher input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!voucherInput) {
    return {
      success: false,
      message: "Telkomsel: Voucher input field not found — page structure may have changed",
      fallback: true,
    };
  }

  // Type voucher code
  await voucherInput.click({ clickCount: 3 });
  await voucherInput.type(code, { delay: INPUT_DELAY });
  console.log(`🔑 Voucher code entered: ${code.substring(0, 4)}****`);

  // Wait for form validation
  await new Promise((r) => setTimeout(r, 1500));

  // Find and click submit button
  const submitSelectors = [
    'button.btn-primary-submit',
    'button:not([disabled])',
  ];

  let submitBtn = null;
  for (const sel of submitSelectors) {
    try {
      const buttons = await page.$$(sel);
      for (const btn of buttons) {
        const text = await page.evaluate((el) => el.textContent?.trim(), btn);
        if (text && (text.toLowerCase().includes("redeem") || text.toLowerCase().includes("tukar"))) {
          const isDisabled = await page.evaluate((el) => el.disabled, btn);
          if (!isDisabled) {
            submitBtn = btn;
            break;
          }
        }
      }
      if (submitBtn) break;
    } catch {}
  }

  if (!submitBtn) {
    return {
      success: false,
      message: "Telkomsel: Submit button not found or disabled — check phone/voucher format",
      fallback: true,
    };
  }

  console.log("🚀 Clicking Redeem button...");
  await submitBtn.click();

  // Wait for response
  await new Promise((r) => setTimeout(r, SUBMIT_WAIT));

  // Check for success/error messages
  const pageText = await page.evaluate(() => document.body?.innerText || "");

  // Detect success indicators
  const successPatterns = [
    /berhasil/i,
    /sukses/i,
    /success/i,
    /voucher.*aktif/i,
    /redeem.*berhasil/i,
    /selamat/i,
  ];

  const errorPatterns = [
    /gagal/i,
    /failed/i,
    /tidak valid/i,
    /invalid/i,
    /sudah digunakan/i,
    /already.*used/i,
    /expired/i,
    /kedaluwarsa/i,
    /tidak ditemukan/i,
    /not found/i,
    /salah/i,
    /nomor.*tidak.*terdaftar/i,
  ];

  const isSuccess = successPatterns.some((p) => p.test(pageText));
  const isError = errorPatterns.some((p) => p.test(pageText));

  if (isSuccess && !isError) {
    console.log("✅ Telkomsel auto-redeem SUCCESS!");
    return {
      success: true,
      message: `Voucher berhasil di-redeem otomatis ke ${phone} via Telkomsel`,
    };
  }

  if (isError) {
    // Extract error message
    const errorMatch = pageText.match(/(gagal|failed|tidak valid|invalid|sudah digunakan|expired|kedaluwarsa|salah|tidak ditemukan)[^\n]*/i);
    const errorDetail = errorMatch ? errorMatch[0].trim().substring(0, 200) : "Unknown error";
    
    console.error(`❌ Telkomsel auto-redeem FAILED: ${errorDetail}`);
    return {
      success: false,
      message: `Telkomsel redeem gagal: ${errorDetail}`,
      fallback: true,
    };
  }

  // Ambiguous result — treat as failure, fallback to manual
  console.warn("⚠️ Telkomsel auto-redeem: ambiguous result, falling back to semi-auto");
  return {
    success: false,
    message: "Telkomsel redeem: hasil tidak jelas — perlu verifikasi manual",
    fallback: true,
  };
}

/**
 * Redeem on byU website
 * URL: https://pidaw-webfront.cx.byu.id/web/tkr-voucher
 * 
 * Form fields:
 *   - Phone: input#byuNumber
 *   - Voucher: input#byuVoucher
 *   - Submit: button with text "Tukar" (class bg-sky-500 when active)
 */
async function redeemByU(browser, phone, code) {
  const page = await browser.newPage();

  // Set viewport and user agent
  await page.setViewport({ width: 1024, height: 768 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  console.log("📱 Navigating to byU redeem page...");
  await page.goto(REDEEM_URLS.byu, {
    waitUntil: "networkidle2",
    timeout: PAGE_LOAD_TIMEOUT,
  });

  // Wait for React SPA to render
  console.log("⏳ Waiting for form to load...");

  // Wait for phone input
  const phoneSelectors = [
    "input#byuNumber",
    'input[aria-label="Nomor By.U"]',
    'input[placeholder*="Nomor"]',
  ];

  let phoneInput = null;
  for (const sel of phoneSelectors) {
    try {
      phoneInput = await page.waitForSelector(sel, { timeout: 10_000 });
      if (phoneInput) {
        console.log(`✅ Phone input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!phoneInput) {
    return {
      success: false,
      message: "byU: Phone input field not found — page structure may have changed",
      fallback: true,
    };
  }

  // Type phone number
  await phoneInput.click({ clickCount: 3 });
  await phoneInput.type(phone, { delay: INPUT_DELAY });
  console.log(`📞 Phone entered: ${phone}`);

  // Wait for validation
  await new Promise((r) => setTimeout(r, 1000));

  // Find voucher input
  const voucherSelectors = [
    "input#byuVoucher",
    'input[aria-label="Kode Voucher"]',
    'input[placeholder*="Voucher"]',
  ];

  let voucherInput = null;
  for (const sel of voucherSelectors) {
    try {
      voucherInput = await page.waitForSelector(sel, { timeout: 5_000 });
      if (voucherInput) {
        console.log(`✅ Voucher input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!voucherInput) {
    return {
      success: false,
      message: "byU: Voucher input field not found — page structure may have changed",
      fallback: true,
    };
  }

  // Type voucher code
  await voucherInput.click({ clickCount: 3 });
  await voucherInput.type(code, { delay: INPUT_DELAY });
  console.log(`🔑 Voucher code entered: ${code.substring(0, 4)}****`);

  // Wait for button to become enabled
  await new Promise((r) => setTimeout(r, 1500));

  // Find submit button
  let submitBtn = null;
  try {
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent?.trim(), btn);
      if (text && text.toLowerCase().includes("tukar")) {
        const isDisabled = await page.evaluate((el) => el.disabled, btn);
        if (!isDisabled) {
          submitBtn = btn;
          break;
        }
      }
    }
  } catch {}

  if (!submitBtn) {
    return {
      success: false,
      message: "byU: Submit button not found or disabled — check phone/voucher format",
      fallback: true,
    };
  }

  console.log("🚀 Clicking Tukar button...");
  await submitBtn.click();

  // Wait for response (byU shows modal)
  await new Promise((r) => setTimeout(r, SUBMIT_WAIT));

  // Check for success/error on page
  const pageText = await page.evaluate(() => document.body?.innerText || "");

  // Detect success indicators
  const successPatterns = [
    /berhasil/i,
    /sukses/i,
    /success/i,
    /voucher.*aktif/i,
    /tukar.*berhasil/i,
    /selamat/i,
  ];

  const errorPatterns = [
    /gagal/i,
    /failed/i,
    /tidak valid/i,
    /invalid/i,
    /sudah digunakan/i,
    /already.*used/i,
    /expired/i,
    /kedaluwarsa/i,
    /tidak ditemukan/i,
    /not found/i,
    /salah/i,
    /nomor.*bukan.*byu/i,
    /maaf/i,
  ];

  const isSuccess = successPatterns.some((p) => p.test(pageText));
  const isError = errorPatterns.some((p) => p.test(pageText));

  if (isSuccess && !isError) {
    console.log("✅ byU auto-redeem SUCCESS!");
    return {
      success: true,
      message: `Voucher berhasil di-redeem otomatis ke ${phone} via byU`,
    };
  }

  if (isError) {
    const errorMatch = pageText.match(/(gagal|failed|tidak valid|invalid|sudah digunakan|expired|kedaluwarsa|salah|maaf|bukan.*byu)[^\n]*/i);
    const errorDetail = errorMatch ? errorMatch[0].trim().substring(0, 200) : "Unknown error";
    
    console.error(`❌ byU auto-redeem FAILED: ${errorDetail}`);
    return {
      success: false,
      message: `byU redeem gagal: ${errorDetail}`,
      fallback: true,
    };
  }

  console.warn("⚠️ byU auto-redeem: ambiguous result, falling back to semi-auto");
  return {
    success: false,
    message: "byU redeem: hasil tidak jelas — perlu verifikasi manual",
    fallback: true,
  };
}
