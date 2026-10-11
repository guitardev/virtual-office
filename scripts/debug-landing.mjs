import { chromium } from "playwright";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\GuitarDev\\.gemini\\antigravity-ide\\brain\\9d93404e-73d3-4976-86ea-71d84f2ed87d";

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click quick demo login
  const demoBtn = page.locator("button:has-text('เข้าใช้งาน')").first();
  console.log("Demo button visible:", await demoBtn.isVisible());
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot of where we landed
  const shotPath = path.join(ARTIFACTS_DIR, "debug_landing.png");
  await page.screenshot({ path: shotPath });
  console.log("Captured landing screen to:", shotPath);

  // Print all button texts
  const buttons = await page.locator("button").allTextContents();
  console.log("Available buttons on page:", buttons.slice(0, 20));

  await browser.close();
}

run();
