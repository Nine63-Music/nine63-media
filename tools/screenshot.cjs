const path = require("path");
const puppeteer = require(path.join(process.env.TEMP, "opencode", "test-harness", "node_modules", "puppeteer-core"));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error") console.log("[console:error]", m.text()); });
  const out = path.join(process.env.TEMP, "opencode", "shots");
  require("fs").mkdirSync(out, { recursive: true });

  await page.goto("http://localhost:8080/#/", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(out, "home.png"), fullPage: false });

  await page.goto("http://localhost:8080/#/beats", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(out, "beats.png"), fullPage: false });

  await page.goto("http://localhost:8080/#/beat/glow", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(out, "detail.png"), fullPage: false });

  await page.evaluate(() => window.ACLASS.Store.addToCart("supertrap-x-darkology-x-lovemusic-x-new-planet--glow", "premium"));
  await page.goto("http://localhost:8080/#/cart", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(out, "cart.png"), fullPage: false });

  await page.goto("http://localhost:8080/#/beats", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector(".card__play").click());
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(out, "player.png"), fullPage: false });

  console.log("screenshots ->", out);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
