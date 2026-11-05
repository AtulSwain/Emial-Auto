// Builds public/otakuva-tester-guide.pdf from guide/tester-guide.html.
// Usage: node scripts/build-guide.cjs   (needs Playwright + Chromium installed)
const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
  const root = path.resolve(__dirname, "..");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + path.join(root, "guide", "tester-guide.html"), { waitUntil: "networkidle" });
  await page.pdf({ path: path.join(root, "public", "otakuva-tester-guide.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log("✓ public/otakuva-tester-guide.pdf");
})();
