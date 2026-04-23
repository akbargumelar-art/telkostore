// ==============================
// TELKO.STORE - Auto-Redeem Engine (Puppeteer)
// Automates voucher redemption on Telkomsel & byU websites
// Falls back to semi-auto if automation fails
// ==============================

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
  byu: "https://www.byu.id/v2/tkr-voucher",
};

const PAGE_LOAD_TIMEOUT = 30_000;
const INPUT_DELAY = 100;
const SUBMIT_WAIT = 10_000;
const FOLLOW_UP_WAIT = 8_000;
const MAX_RETRIES = 2;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function getBodyText(page) {
  try {
    return await page.evaluate(() => document.body?.innerText || "");
  } catch {
    return "";
  }
}

function createResponseTracker(page, matcher) {
  const tracked = [];

  const handler = async (response) => {
    try {
      const url = response.url();
      const request = response.request();
      const method = request.method();
      const resourceType = request.resourceType();
      const headers = response.headers();
      const contentType = String(headers["content-type"] || headers["Content-Type"] || "");

      if (!matcher(url, method, resourceType, contentType)) return;

      let bodyText = "";

      if (contentType.includes("application/json")) {
        const jsonBody = await response.json().catch(() => null);
        bodyText = jsonBody ? JSON.stringify(jsonBody) : "";
      } else {
        bodyText = await response.text().catch(() => "");
      }

      tracked.push({
        url,
        method,
        resourceType,
        status: response.status(),
        contentType,
        bodyText: bodyText.slice(0, 4000),
      });
    } catch {
      // Ignore tracker parsing issues.
    }
  };

  page.on("response", handler);

  return {
    tracked,
    detach() {
      page.off("response", handler);
    },
  };
}

function responseTextLooksLikeAsset(text) {
  const haystack = normalizeText(text);
  return [
    "copyright (c)",
    "react-dom",
    "react.production",
    "__webpack_require__",
    "sourcemappingurl=",
    "use strict",
    "window.__",
  ].some((needle) => haystack.includes(needle));
}

function responseTextLooksSuccessful(text) {
  const haystack = normalizeText(text);
  return [
    "berhasil",
    "sukses",
    "success",
    "voucher aktif",
    "redeem berhasil",
    "tukar berhasil",
    "selamat",
    "paket aktif",
    "kuota aktif",
    "kuota utama",
  ].some((needle) => haystack.includes(needle));
}

function responseTextLooksFailed(text) {
  const haystack = normalizeText(text);
  return [
    "gagal",
    "failed",
    "tidak valid",
    "invalid",
    "sudah digunakan",
    "already used",
    "expired",
    "kedaluwarsa",
    "tidak ditemukan",
    "not found",
    "nomor tidak sesuai",
    "nomor bukan byu",
    "terjadi kesalahan",
    "coba lagi",
    "maaf",
  ].some((needle) => haystack.includes(needle));
}

function detectTrackedResponseResult(tracked) {
  for (const entry of tracked.slice().reverse()) {
    if (responseTextLooksLikeAsset(entry.bodyText)) {
      continue;
    }

    if (entry.status >= 400) {
      return {
        success: false,
        message: `HTTP ${entry.status} dari ${entry.url}`,
      };
    }

    if (responseTextLooksSuccessful(entry.bodyText) && !responseTextLooksFailed(entry.bodyText)) {
      return {
        success: true,
        message: `Respons sukses terdeteksi dari ${entry.url}`,
      };
    }

    if (responseTextLooksFailed(entry.bodyText)) {
      return {
        success: false,
        message: entry.bodyText.slice(0, 200),
      };
    }
  }

  return null;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function humanizeMachineText(text) {
  return String(text || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectTelkomselTrackedResponse(tracked) {
  const redeemResponses = tracked.filter((entry) =>
    normalizeText(entry.url).includes("/api/voucher/redeem")
  );

  for (const entry of redeemResponses.slice().reverse()) {
    const payload = tryParseJson(entry.bodyText);
    const data = payload?.data || payload || {};
    const code = String(data?.code || payload?.code || "").trim();
    const description = String(data?.description || payload?.description || "").trim();
    const normalizedDescription = normalizeText(description);

    if (code === "15" || normalizedDescription.includes("alreadyused")) {
      return {
        success: false,
        message: "voucher sudah terpakai",
      };
    }

    if (normalizedDescription.includes("expired")) {
      return {
        success: false,
        message: "voucher kedaluwarsa",
      };
    }

    if (normalizedDescription.includes("invalid")) {
      return {
        success: false,
        message: "kode voucher tidak valid",
      };
    }

    if (
      entry.status < 400 &&
      payload &&
      (payload.success === true || payload.status === true) &&
      !code &&
      !responseTextLooksFailed(entry.bodyText)
    ) {
      return {
        success: true,
        message: `Respons sukses terdeteksi dari ${entry.url}`,
      };
    }

    if (entry.status >= 400 || code || responseTextLooksFailed(entry.bodyText)) {
      return {
        success: false,
        message:
          humanizeMachineText(description) ||
          (code ? `kode error ${code}` : `HTTP ${entry.status} dari ${entry.url}`),
      };
    }
  }

  return null;
}

function getTrackerSummary(tracked) {
  return tracked
    .slice(-3)
    .map((entry) => `${entry.method} ${entry.status} ${entry.url}`)
    .join(" | ");
}

async function clickButtonByText(page, labels, options = {}) {
  const { exact = false, preferLast = false } = options;
  return page.evaluate((rawLabels, exactMatch, preferLastMatch) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const labelSet = rawLabels.map((label) => normalize(label));
    const buttons = Array.from(document.querySelectorAll("button"))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const style = window.getComputedStyle(button);
        return {
          button,
          text: normalize(button.textContent || ""),
          disabled:
            Boolean(button.disabled) ||
            button.getAttribute("aria-disabled") === "true",
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0",
          top: rect.top,
        };
      })
      .filter((candidate) => candidate.text && candidate.visible);

    const matches = buttons.filter((candidate) => {
      if (candidate.disabled) return false;

      return labelSet.some((label) =>
        exactMatch ? candidate.text === label : candidate.text.includes(label)
      );
    });

    if (!matches.length) {
      return null;
    }

    matches.sort((left, right) =>
      preferLastMatch ? right.top - left.top : left.top - right.top
    );

    const target = matches[0];
    target.button.scrollIntoView({ block: "center", inline: "center" });
    target.button.click();
    return target.text;
  }, labels, exact, preferLast);
}

async function clickLabelByText(page, labels) {
  return page.evaluate((rawLabels) => {
    const normalize = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const labelSet = rawLabels.map((label) => normalize(label));
    const labelsInPage = Array.from(document.querySelectorAll("label"));

    for (const label of labelsInPage) {
      const text = normalize(label.textContent || "");
      const rect = label.getBoundingClientRect();
      const style = window.getComputedStyle(label);

      if (
        !text ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        continue;
      }

      if (labelSet.some((candidate) => text.includes(candidate))) {
        label.scrollIntoView({ block: "center", inline: "center" });
        label.click();
        return text;
      }
    }

    return null;
  }, labels);
}

function filterByUTerminalResponses(tracked) {
  return tracked.filter((entry) => {
    const url = normalizeText(entry.url);
    return ![
      "global_config",
      "maintenancebanner/status",
      "localisation/language/keys",
      "localisation/languages",
      "msisdn/validation",
      "vouchers/fetch-product",
      "product-variants",
    ].some((needle) => url.includes(needle));
  });
}

function hasByUConfirmationStep(text) {
  const haystack = normalizeText(text);
  return (
    haystack.includes("yakin mau tukar paket") &&
    haystack.includes("saya setuju untuk mengaktifkan kuota")
  );
}

export async function isPuppeteerAvailable() {
  const pup = await loadPuppeteer();
  return pup !== null;
}

export async function autoRedeemVoucher(provider, code, phone, retryCount = 0) {
  const puppeteer = await loadPuppeteer();

  if (!puppeteer) {
    return {
      success: false,
      message: "Puppeteer not installed - falling back to semi-auto",
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

  const normalizedPhone = phone.replace(/^(\+62|62)/, "0").replace(/\D/g, "");

  console.log(
    `Auto-redeem starting: provider=${provider}, phone=${normalizedPhone}, code=${code.substring(0, 4)}****`
  );

  let browser = null;

  try {
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

    if (provider === "byu") {
      return await redeemByU(browser, normalizedPhone, code);
    }

    return await redeemTelkomsel(browser, normalizedPhone, code);
  } catch (err) {
    console.error(`Auto-redeem error (attempt ${retryCount + 1}):`, err.message);

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying auto-redeem (${retryCount + 1}/${MAX_RETRIES})...`);
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      await wait(2000);
      return autoRedeemVoucher(provider, code, phone, retryCount + 1);
    }

    return {
      success: false,
      message: `Auto-redeem failed after ${MAX_RETRIES + 1} attempts: ${err.message}`,
      fallback: true,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

async function redeemTelkomsel(browser, phone, code) {
  const page = await browser.newPage();
  const tracker = createResponseTracker(page, (url, method, resourceType) => {
    const normalizedUrl = normalizeText(url);

    if (!["GET", "POST"].includes(method)) return false;
    if (!["xhr", "fetch", "document"].includes(resourceType)) return false;

    return (
      normalizedUrl.includes("telkomsel.com/api/voucher/redeem") ||
      normalizedUrl.includes("/shops/voucher/redeem/failed") ||
      normalizedUrl.includes("/shops/voucher/redeem/success")
    );
  });

  await page.setViewport({ width: 1024, height: 768 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  console.log("Navigating to Telkomsel redeem page...");
  await page.goto(REDEEM_URLS.simpati, {
    waitUntil: "networkidle2",
    timeout: PAGE_LOAD_TIMEOUT,
  });

  console.log("Waiting for Telkomsel form to load...");

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
        console.log(`Telkomsel phone input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!phoneInput) {
    return {
      success: false,
      message: "Telkomsel: Phone input field not found - page structure may have changed",
      fallback: true,
    };
  }

  await phoneInput.click({ clickCount: 3 });
  await phoneInput.type(phone, { delay: INPUT_DELAY });
  console.log(`Telkomsel phone entered: ${phone}`);

  await wait(1000);

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
        console.log(`Telkomsel voucher input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!voucherInput) {
    return {
      success: false,
      message: "Telkomsel: Voucher input field not found - page structure may have changed",
      fallback: true,
    };
  }

  await voucherInput.click({ clickCount: 3 });
  await voucherInput.type(code, { delay: INPUT_DELAY });
  console.log(`Telkomsel voucher entered: ${code.substring(0, 4)}****`);

  await wait(1500);

  const submitSelectors = ['button.btn-primary-submit', 'button:not([disabled])'];
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
      message: "Telkomsel: Submit button not found or disabled - check phone/voucher format",
      fallback: true,
    };
  }

  console.log("Clicking Telkomsel Redeem button...");
  await submitBtn.click();
  await page
    .waitForFunction(
      () => {
        const text = String(document.body?.innerText || "").toLowerCase();
        return (
          location.href.includes("/failed") ||
          location.href.includes("/success") ||
          text.includes("redeem voucher gagal") ||
          text.includes("redeem voucher berhasil")
        );
      },
      { timeout: SUBMIT_WAIT }
    )
    .catch(() => null);

  await wait(1500);

  const currentUrl = page.url();
  const pageText = await getBodyText(page);
  const trackedResult = detectTelkomselTrackedResponse(tracker.tracked);
  const trackerSummary = getTrackerSummary(tracker.tracked);
  tracker.detach();

  if (trackedResult?.success) {
    console.log("Telkomsel auto-redeem SUCCESS via network response");
    return {
      success: true,
      message: trackedResult.message,
    };
  }

  if (trackedResult && !trackedResult.success) {
    console.error(`Telkomsel auto-redeem FAILED via network response: ${trackedResult.message}`);
    return {
      success: false,
      message: `Telkomsel redeem gagal: ${trackedResult.message}`,
      fallback: true,
    };
  }

  if (currentUrl.includes("/failed")) {
    const pageErrorMatch = pageText.match(/maaf,[^\n]*/i);
    const pageErrorDetail = pageErrorMatch
      ? pageErrorMatch[0].trim().substring(0, 220)
      : "redeem voucher gagal";

    console.error(`Telkomsel auto-redeem FAILED via failed page: ${pageErrorDetail}`);
    return {
      success: false,
      message: `Telkomsel redeem gagal: ${pageErrorDetail}`,
      fallback: true,
    };
  }

  if (currentUrl.includes("/success") || /redeem voucher berhasil/i.test(pageText)) {
    console.log("Telkomsel auto-redeem SUCCESS via success page");
    return {
      success: true,
      message: `Voucher berhasil di-redeem otomatis ke ${phone} via Telkomsel`,
    };
  }

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
    /telah terpakai/i,
    /expired/i,
    /kedaluwarsa/i,
    /tidak ditemukan/i,
    /not found/i,
    /nomor.*tidak.*terdaftar/i,
  ];

  const isSuccess = successPatterns.some((pattern) => pattern.test(pageText));
  const isError = errorPatterns.some((pattern) => pattern.test(pageText));

  if (isSuccess && !isError) {
    console.log("Telkomsel auto-redeem SUCCESS");
    return {
      success: true,
      message: `Voucher berhasil di-redeem otomatis ke ${phone} via Telkomsel`,
    };
  }

  if (isError) {
    const errorMatch = pageText.match(
      /(gagal|failed|tidak valid|invalid|sudah digunakan|expired|kedaluwarsa|salah|tidak ditemukan)[^\n]*/i
    );
    const errorDetail = errorMatch ? errorMatch[0].trim().substring(0, 200) : "Unknown error";

    console.error(`Telkomsel auto-redeem FAILED: ${errorDetail}`);
    return {
      success: false,
      message: `Telkomsel redeem gagal: ${errorDetail}`,
      fallback: true,
    };
  }

  console.warn("Telkomsel auto-redeem ambiguous, falling back to semi-auto");
  return {
    success: false,
    message:
      "Telkomsel redeem: hasil tidak jelas - perlu verifikasi manual" +
      (trackerSummary ? ` (${trackerSummary})` : ""),
    fallback: true,
  };
}

async function redeemByU(browser, phone, code) {
  const page = await browser.newPage();
  const tracker = createResponseTracker(page, (url, method, resourceType) => {
    const normalizedUrl = normalizeText(url);
    if (!["GET", "POST", "PUT", "PATCH"].includes(method)) return false;
    if (!["xhr", "fetch", "document"].includes(resourceType)) return false;
    if (
      ![
        "voucher",
        "redeem",
        "tkr",
        "claim",
        "activate",
        "activation",
      ].some((keyword) => normalizedUrl.includes(keyword))
    ) {
      return false;
    }

    return (
      normalizedUrl.includes("pidaw-app.cx.byu.id") ||
      normalizedUrl.includes("pidaw-webfront.cx.byu.id") ||
      normalizedUrl.includes("byu.id")
    );
  });

  await page.setViewport({ width: 1024, height: 768 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  console.log("Navigating to byU redeem page...");
  await page.goto(REDEEM_URLS.byu, {
    waitUntil: "networkidle2",
    timeout: PAGE_LOAD_TIMEOUT,
  });

  console.log("Waiting for byU form to load...");

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
        console.log(`byU phone input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!phoneInput) {
    tracker.detach();
    return {
      success: false,
      message: "byU: Phone input field not found - page structure may have changed",
      fallback: true,
    };
  }

  await phoneInput.click({ clickCount: 3 });
  await phoneInput.type(phone, { delay: INPUT_DELAY });
  console.log(`byU phone entered: ${phone}`);

  await wait(1000);

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
        console.log(`byU voucher input found: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!voucherInput) {
    tracker.detach();
    return {
      success: false,
      message: "byU: Voucher input field not found - page structure may have changed",
      fallback: true,
    };
  }

  await voucherInput.click({ clickCount: 3 });
  await voucherInput.type(code, { delay: INPUT_DELAY });
  console.log(`byU voucher entered: ${code.substring(0, 4)}****`);

  await wait(1500);

  let clickedSubmit = await clickButtonByText(page, ["tukar"], { exact: true });

  if (!clickedSubmit) {
    tracker.detach();
    return {
      success: false,
      message: "byU: Submit button not found or disabled - check phone/voucher format",
      fallback: true,
    };
  }

  console.log(`Clicking byU submit button: ${clickedSubmit}`);
  await wait(4_000);

  let pageText = await getBodyText(page);

  if (!hasByUConfirmationStep(pageText) && page.url().includes("msisdn=")) {
    const secondSubmit = await clickButtonByText(page, ["tukar"], { exact: true });
    if (secondSubmit) {
      console.log(`Clicking byU confirmation trigger: ${secondSubmit}`);
      await wait(5_000);
      pageText = await getBodyText(page);
    }
  }

  if (hasByUConfirmationStep(pageText)) {
    const agreementLabel = await clickLabelByText(page, ["saya setuju untuk mengaktifkan kuota"]);
    if (agreementLabel) {
      console.log(`byU agreement checked: ${agreementLabel}`);
      await wait(1_500);
    }

    clickedSubmit = await clickButtonByText(page, ["tukar"], {
      exact: true,
      preferLast: true,
    });

    if (!clickedSubmit) {
      tracker.detach();
      return {
        success: false,
        message: "byU: halaman konfirmasi muncul tetapi tombol Tukar final belum aktif",
        fallback: true,
      };
    }

    console.log(`Clicking byU final confirm button: ${clickedSubmit}`);
    await wait(SUBMIT_WAIT);
    pageText = await getBodyText(page);
  }

  const followUpButton = await clickButtonByText(
    page,
    ["aktifkan paket", "aktifkan", "lanjut", "konfirmasi", "ya, lanjut", "ok"],
    { preferLast: true }
  );

  if (followUpButton) {
    console.log(`byU follow-up button clicked: ${followUpButton}`);
    await wait(FOLLOW_UP_WAIT);
    pageText = await getBodyText(page);
  }

  await page
    .waitForFunction(
      () => {
        const text = String(document.body?.innerText || "").toLowerCase();
        return [
          "berhasil",
          "sukses",
          "success",
          "paket aktif",
          "kuota aktif",
          "gagal",
          "tidak valid",
          "sudah digunakan",
          "expired",
          "maaf",
        ].some((needle) => text.includes(needle));
      },
      { timeout: 10_000 }
    )
    .catch(() => null);

  pageText = await getBodyText(page);
  const byUTerminalResponses = filterByUTerminalResponses(tracker.tracked);
  const trackedResult = detectTrackedResponseResult(byUTerminalResponses);
  const trackerSummary = getTrackerSummary(
    byUTerminalResponses.length ? byUTerminalResponses : tracker.tracked
  );
  tracker.detach();

  if (trackedResult?.success) {
    console.log("byU auto-redeem SUCCESS via network response");
    return {
      success: true,
      message: trackedResult.message,
    };
  }

  if (trackedResult && !trackedResult.success) {
    console.error(`byU auto-redeem FAILED via network response: ${trackedResult.message}`);
    return {
      success: false,
      message: `byU redeem gagal: ${trackedResult.message.substring(0, 200)}`,
      fallback: true,
    };
  }

  const successPatterns = [
    /berhasil/i,
    /sukses/i,
    /success/i,
    /voucher.*aktif/i,
    /tukar.*berhasil/i,
    /selamat/i,
    /paket.*aktif/i,
    /kuota.*aktif/i,
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
    /terjadi.*kesalahan/i,
  ];

  const isSuccess = successPatterns.some((pattern) => pattern.test(pageText));
  const isError = errorPatterns.some((pattern) => pattern.test(pageText));

  if (isSuccess && !isError) {
    console.log("byU auto-redeem SUCCESS");
    return {
      success: true,
      message: `Voucher berhasil di-redeem otomatis ke ${phone} via byU`,
    };
  }

  if (isError) {
    const errorMatch = pageText.match(
      /(gagal|failed|tidak valid|invalid|sudah digunakan|expired|kedaluwarsa|salah|maaf|bukan.*byu|terjadi.*kesalahan)[^\n]*/i
    );
    const errorDetail = errorMatch ? errorMatch[0].trim().substring(0, 200) : "Unknown error";

    console.error(`byU auto-redeem FAILED: ${errorDetail}`);
    return {
      success: false,
      message: `byU redeem gagal: ${errorDetail}`,
      fallback: true,
    };
  }

  console.warn("byU auto-redeem ambiguous, falling back to semi-auto");
  return {
    success: false,
    message:
      "byU redeem: hasil tidak jelas - perlu verifikasi manual" +
      (trackerSummary ? ` (${trackerSummary})` : ""),
    fallback: true,
  };
}
