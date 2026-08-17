/* ACLASS smoke test — drives the real site in headless Chrome via puppeteer-core. */
const path = require("path");
const puppeteer = require(path.join(process.env.TEMP, "opencode", "test-harness", "node_modules", "puppeteer-core"));

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:8080/";

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok ? "" : extra ? "  " + extra : ""));
  if (!ok) failures++;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function go(hash) {
    await page.goto(BASE + "#" + hash, { waitUntil: "networkidle0" });
    await wait(300);
  }

  async function clickSel(sel) {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (el) el.scrollIntoView({ block: "center" });
    }, sel);
    await wait(150);
    await page.click(sel);
  }

  /* ---------- Home ---------- */
  await go("/");
  check("home renders hero headline", await page.$eval("h1", (el) => el.textContent.includes("You just found your sound")));
  check("home has marquee", await page.$(".marquee__track"));
  check("home has fresh drops grid", await page.$('[id="fresh"] .grid'));
  check("home has trending grid", await page.$('[id="trending"] .grid'));
  check("home has sound tiles", (await page.$$('[id="sounds"] .tile')).length >= 4);
  check("home has vibe section", await page.$('[data-role="vibe-chips"]'));
  check("home has story band", await page.$(".about-band"));

  /* ---------- Library ---------- */
  await go("/beats");
  check("library title", await page.$eval(".page-head h1", (el) => el.textContent.includes("vault")));
  const cardCount = (await page.$$('[data-card-id]')).length;
  check("library cards >= 50", cardCount >= 50, "got " + cardCount);

  /* search filter */
  await page.type('[data-role="lib-q"]', "glow");
  await wait(500);
  const searchCount = (await page.$$('[data-card-id]')).length;
  check("search 'glow' narrows results", searchCount > 0 && searchCount < cardCount, "got " + searchCount);

  /* genre filter */
  await go("/beats?genre=uk-drill");
  const drillCount = (await page.$$('[data-card-id]')).length;
  check("genre=uk-drill yields 10", drillCount === 10, "got " + drillCount);

  /* mood filter */
  await go("/beats?mood=dark");
  const darkCount = (await page.$$('[data-card-id]')).length;
  check("mood=dark yields 50", darkCount === 50, "got " + darkCount);

  /* empty state */
  await go("/beats?q=zzzzqqq");
  check("empty state shows", await page.$(".empty-state"));

  /* ---------- Detail ---------- */
  await go("/beat/glow");
  check("detail title", await page.$eval(".beat-title", (el) => el.textContent.trim() === "GLOW"));
  check("detail has license cards", (await page.$$(".license-card")).length >= 4);
  check("detail has meta pills", (await page.$$(".meta-pill")).length > 0);
  check("detail has related grid", await page.$(".card"));
  check("breadcrumb present", await page.$(".breadcrumb"));

  /* play from detail */
  await page.click('[data-action="play"][data-id]');
  await wait(800);
  const isPlaying = await page.evaluate(() => {
    const el = document.querySelector(".player__play, [data-role='playing']");
    return !!document.querySelector(".player");
  });
  check("player bar appears", isPlaying);
  const playingTitle = await page.$eval(".player__title", (el) => el.textContent.trim());
  check("player shows current title", playingTitle === "GLOW", "got " + playingTitle);

  /* favorites */
  await page.click('[data-action="fav"][data-id]');
  await wait(200);
  const faved = await page.evaluate(() => window.ACLASS.Store.isFav("supertrap-x-darkology-x-lovemusic-x-new-planet--glow"));
  check("favorite toggled", faved === true);

  /* add to cart */
  await clickSel('[data-action="add-cart"]');
  await wait(200);
  const cartCount = await page.evaluate(() => window.ACLASS.Store.cartCount);
  check("cart has item", cartCount === 1, "got " + cartCount);

  /* ---------- Genre/mood/collection pages ---------- */
  await go("/genre/uk-drill");
  check("genre page", await page.$eval(".page-head h1", (el) => el.textContent.includes("UK Drill")));
  await go("/mood/chill");
  check("mood page", await page.$eval(".page-head h1", (el) => el.textContent.includes("chill")));
  await go("/collection/plug-x-new-wave-x-smooth-trap-x-laid-back");
  check("collection page", await page.$eval(".page-head h1", (el) => el.textContent.includes("Plug")));

  /* ---------- Genres & moods overview ---------- */
  await go("/genres");
  check("genres overview tiles", (await page.$$(".tile")).length >= 15);
  await go("/moods");
  check("moods overview tiles", (await page.$$(".tile")).length >= 8);

  /* ---------- Cart ---------- */
  await go("/cart");
  check("cart shows item", await page.$(".cart-item"));
  await clickSel('[data-action="place-order"]');
  await wait(150);
  check("cart order validation", await page.$('[data-role="order-confirm"]:not([hidden])') === null); // no email → stays on form
  await page.type("#co-email", "artist@example.com");
  await clickSel('[data-action="place-order"]');
  await wait(150);
  check("order summary shown", await page.$eval('[data-role="order-confirm"]', (el) => !el.hidden));

  /* ---------- Favorites page ---------- */
  await go("/favorites");
  check("favorites page shows saved beat", (await page.$$(".card")).length === 1);

  /* ---------- Licenses / About ---------- */
  await go("/licenses");
  check("licenses page", (await page.$$(".license-card")).length >= 4);
  check("licenses faq", (await page.$$(".faq details")).length >= 4);
  await go("/about");
  check("about page", await page.$eval("h1", (el) => el.textContent.includes("studio")));

  /* ---------- 404 ---------- */
  await go("/nope");
  check("404 handled", await page.$(".empty-state"));

  /* ---------- Search overlay ---------- */
  await go("/");
  await page.click("#nav-search");
  await wait(200);
  check("search overlay opens", await page.$eval("#search-overlay", (el) => !el.hidden));
  await page.type("#search-input", "dark trap");
  await wait(500);
  const sr = await page.$$eval("#search-results .search-result", (els) => els.length);
  check("search overlay results", sr > 0, "got " + sr);

  /* ---------- Mobile viewport ---------- */
  await page.keyboard.press("Escape");
  await wait(200);
  await page.setViewport({ width: 390, height: 844 });
  await go("/beats");
  check("mobile burger visible", await page.$eval("#nav-burger", (el) => getComputedStyle(el).display !== "none"));
  await page.click("#nav-burger");
  await wait(200);
  check("mobile drawer opens", await page.$eval("#nav-drawer", (el) => !el.hidden));
  await page.click("#nav-drawer a");
  await wait(300);
  check("mobile drawer nav works", await page.$eval(".page-head h1", (el) => !!el.textContent));

  /* ---------- Console errors ---------- */
  const real = consoleErrors.filter((m) => !/Download the React DevTools/i.test(m));
  check("no console errors", real.length === 0, real.slice(0, 5).join(" | "));

  console.log("\n" + (failures ? failures + " FAILURE(S)" : "ALL TESTS PASSED"));
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
