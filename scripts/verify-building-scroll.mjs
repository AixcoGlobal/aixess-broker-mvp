import { chromium } from "playwright";

const BASE_URL = process.env.AIXESS_URL || "http://localhost:5173/#residences";

async function waitForExplorer(page) {
  await page.waitForSelector(".building-map canvas", { timeout: 120_000 });
}

async function scrollToSettledBottom(page) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(100);
  }

  await page.waitForFunction(
    () => document.querySelector(".building-map.is-settled") !== null
      && window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2,
    { timeout: 30_000 },
  );
}

async function wheelOverCanvas(page, deltaY) {
  const point = await page.evaluate(() => {
    const canvas = document.querySelector(".building-map canvas");
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(300);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForSelector(".residence-explorer", { timeout: 120_000 });
  await page.evaluate(() => document.querySelector(".residence-explorer")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(400);
  await waitForExplorer(page);
  await scrollToSettledBottom(page);

  const before = await page.evaluate(() => window.scrollY);
  await wheelOverCanvas(page, -120);
  const afterUp = await page.evaluate(() => window.scrollY);
  await wheelOverCanvas(page, 120);
  const afterDown = await page.evaluate(() => window.scrollY);

  const results = { before, afterUp, afterDown };
  console.log(JSON.stringify(results, null, 2));

  const upWorked = afterUp < before;
  const downWorked = afterDown > afterUp;

  if (!upWorked || !downWorked) {
    console.error("FAIL: mouse wheel did not scroll the page over the settled building canvas");
    process.exitCode = 1;
  } else {
    console.log("PASS: mouse wheel scroll works up and down over the settled building canvas");
  }
} catch (error) {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
