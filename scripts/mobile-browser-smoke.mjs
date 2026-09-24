import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.MOBILE_SMOKE_BASE_URL || "http://127.0.0.1:3000";
const screenshotDir = process.env.MOBILE_SMOKE_SCREENSHOT_DIR || "/tmp/ilkoku-mobile-smoke";
const executableCandidates = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const executablePath = executableCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome/Chromium executable not found on CI runner.");
}

const viewports = [
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
];

const routes = [
  { name: "home", path: "/" },
  { name: "about", path: "/hakkimizda" },
  { name: "how-it-works", path: "/nasil-calisir" },
  { name: "help", path: "/yardim" },
  { name: "login", path: "/giris" },
  { name: "register", path: "/kayit" },
];

mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const failures = [];
let executed = 0;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: true,
      reducedMotion: "reduce",
    });

    for (const route of routes) {
      const page = await context.newPage();
      const label = `${route.name}@${viewport.name}`;
      const response = await page.goto(`${baseUrl}${route.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      await page.addStyleTag({
        content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}",
      });
      await page.waitForTimeout(250);

      const status = response?.status() ?? 0;
      const checks = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const overflow = Math.max(root.scrollWidth, body?.scrollWidth ?? 0) - window.innerWidth;
        const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "";
        const visibleText = (body?.innerText ?? "").trim();

        const undersizedControls = [...document.querySelectorAll("button, select, textarea, summary, input")]
          .filter((element) => {
            if (!(element instanceof HTMLElement)) return false;
            if (element instanceof HTMLInputElement && ["hidden", "checkbox", "radio"].includes(element.type)) return false;
            const style = getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return rect.width < 28 || rect.height < 28;
          })
          .slice(0, 8)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              text: (element.textContent ?? "").trim().slice(0, 60),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          });

        return {
          overflow,
          viewportMeta,
          textLength: visibleText.length,
          undersizedControls,
        };
      });

      await page.screenshot({
        path: `${screenshotDir}/${label}.png`,
        fullPage: true,
      });

      const issues = [];
      if (status < 200 || status >= 400) issues.push(`HTTP ${status}`);
      if (checks.overflow > 2) issues.push(`horizontal overflow ${checks.overflow}px`);
      if (!checks.viewportMeta.toLowerCase().includes("width=device-width")) issues.push("viewport meta missing");
      if (checks.textLength < 80) issues.push(`visible text unexpectedly short (${checks.textLength})`);
      if (checks.undersizedControls.length > 0) {
        issues.push(`undersized controls: ${JSON.stringify(checks.undersizedControls)}`);
      }

      executed += 1;
      if (issues.length > 0) {
        failures.push({ label, issues });
        console.error(`FAIL ${label}: ${issues.join(" | ")}`);
      } else {
        console.log(`PASS ${label}`);
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Mobile browser smoke executed ${executed} scenarios.`);

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
