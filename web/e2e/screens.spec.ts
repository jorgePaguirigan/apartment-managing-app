import { mkdirSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

type State = Exclude<NonNullable<Parameters<Browser["newContext"]>[0]>["storageState"], string | undefined>;
import { issueToken, newUser, psql, signIn } from "./helpers";

// Every screen at every phone and tablet size must fit: no sideways scroll, nothing cut off, nothing hidden under the dock,
// tap targets big enough, modals inside the viewport, no console errors. Also saves a screenshot of each screen.
type Device = { name: string; width: number; height: number };
const PHONES: Device[] = [
  { name: "phone-320x568", width: 320, height: 568 }, // iPhone SE 1st gen, the smallest
  { name: "phone-360x800", width: 360, height: 800 }, // common Android
  { name: "phone-375x667", width: 375, height: 667 }, // iPhone SE 2/3
  { name: "phone-375x812", width: 375, height: 812 }, // iPhone mini
  { name: "phone-390x844", width: 390, height: 844 }, // iPhone 14/15/16
  { name: "phone-430x932", width: 430, height: 932 }, // iPhone Pro Max
  { name: "phone-landscape-667x375", width: 667, height: 375 },
  { name: "phone-landscape-844x390", width: 844, height: 390 },
  { name: "phone-landscape-932x430", width: 932, height: 430 },
];
const TABLETS: Device[] = [
  { name: "tablet-744x1133", width: 744, height: 1133 }, // iPad mini
  { name: "tablet-768x1024", width: 768, height: 1024 }, // iPad 9.7
  { name: "tablet-800x1280", width: 800, height: 1280 }, // Android tablet
  { name: "tablet-820x1180", width: 820, height: 1180 }, // iPad 10.9
  { name: "tablet-834x1194", width: 834, height: 1194 }, // iPad Pro 11
  { name: "tablet-1024x1366", width: 1024, height: 1366 }, // iPad Pro 12.9
  { name: "tablet-landscape-1133x744", width: 1133, height: 744 },
  { name: "tablet-landscape-1180x820", width: 1180, height: 820 },
  { name: "tablet-landscape-1194x834", width: 1194, height: 834 },
  { name: "tablet-landscape-1366x1024", width: 1366, height: 1024 },
];
const DEVICES = [...PHONES, ...TABLETS];
const OUT = "screens-out/screens"; // not under test-results: Playwright empties that folder at the start of every run
const dark = !!process.env.SCREENS_DARK;
const stamp = Date.now();

// Worst-case names on purpose: a long unbroken name and long words are what break layouts.
const mateName = `mate-with-a-really-long-unbroken-name-${stamp}`;
let adminState: State;
let mateState: State;
let token = "";
let invitePath = "";

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `screensadmin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("The Extremely Long Household Name Apartments 4B");
  await admin.page.getByLabel("Your name").fill("Maximiliana Featherstonehaugh-Throckmorton");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  invitePath = new URL(await admin.page.locator("p.font-mono").first().innerText()).pathname;
  await signIn(mate.page, `${mateName}@example.com`, invitePath);
  await expect(mate.page.getByText(`Hi, ${mateName}`)).toBeVisible();

  // A scored claim for the leaderboard, a pending one for the admin inbox, enough deeds for "See more", and a budget.
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();
  await admin.page.reload();
  await admin.page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(admin.page.getByText("All caught up")).toBeVisible();
  await mate.page.reload();
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();
  psql(`insert into public.deed (household_id, name, points, kind, active)
    select m.household_id, 'Extra deed number ' || g || ' with a rather long name to wrap', 3, 'good', true
    from public.member m cross join generate_series(1, 22) g where m.display_name = '${mateName}'`);
  await admin.page.goto("/budget");
  await admin.page.getByPlaceholder("New category").fill("Internet and cable subscription");
  await admin.page.getByPlaceholder("PHP / month").fill("1500");
  await admin.page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(admin.page.getByText("₱1,500.00").first()).toBeVisible();
  token = issueToken(mateName);
  expect(token).toMatch(/^[0-9a-f]{64}$/);
  adminState = await admin.ctx.storageState();
  mateState = await mate.ctx.storageState();
  await admin.ctx.close();
  await mate.ctx.close();
});

// Runs every check on the current screen of `page`, then saves its screenshot. Returns the problems found.
async function inspect(page: Page, d: Device, name: string, errors: string[]) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => scrollTo(0, 0));
  mkdirSync(`${OUT}${dark ? "-dark" : ""}/${d.name}`, { recursive: true });
  await page.screenshot({ path: `${OUT}${dark ? "-dark" : ""}/${d.name}/${name}.png`, fullPage: !name.endsWith("see-more") }); // a modal is fixed to the viewport, so a full-page shot would misplace it
  // A mobile browser stretches the layout viewport to fit wide content, so innerWidth would hide the very overflow we look for.
  const problems = await page.evaluate(({ vw, vh }) => {
    const out: string[] = [];
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""} "${(el.textContent ?? "").trim().slice(0, 30)}"`;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0;
    };
    // Inside a scroller (overflow auto/scroll) or a decorative layer, running past the edge is by design.
    const exempt = (el: Element) => {
      for (let p: Element | null = el; p; p = p.parentElement) {
        if (p.hasAttribute("data-roamers") || p.getAttribute("aria-hidden") === "true") return true;
        const ox = getComputedStyle(p).overflowX;
        if (p !== document.documentElement && (ox === "auto" || ox === "scroll" || ox === "hidden")) return true;
      }
      return false;
    };
    if (document.documentElement.scrollWidth > vw) out.push(`sideways scroll: page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el) || exempt(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) out.push(`past the edge (${Math.round(r.left)} to ${Math.round(r.right)} of ${vw}): ${label(el)}`);
    }
    const inText = (el: Element) => el.tagName === "A" && !!el.closest("p") && getComputedStyle(el).display === "inline";
    for (const el of document.querySelectorAll("button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), summary, [role=button]")) {
      if (!visible(el) || exempt(el) || inText(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) out.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)}: ${label(el)}`);
    }
    // A short one-word text that wraps has been broken mid-word ("Hom / e"). Long user text is allowed to wrap.
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const owner = n.parentElement;
      if (!owner || text.length < 2 || text.length > 20 || /\s/.test(text) || !visible(owner) || exempt(owner)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      if (new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1) out.push(`text breaks mid-word: ${label(owner)}`);
    }
    const dock = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed" && visible(n));
    const main = document.querySelector("main");
    if (dock && main) {
      scrollTo(0, document.documentElement.scrollHeight);
      if ((main.lastElementChild ?? main).getBoundingClientRect().bottom > dock.getBoundingClientRect().top + 1) out.push(`the bottom of the page is hidden under the dock (content ends ${Math.round((main.lastElementChild ?? main).getBoundingClientRect().bottom)}, dock starts ${Math.round(dock.getBoundingClientRect().top)}, scrollY ${Math.round(scrollY)}, page ${document.documentElement.scrollHeight}, viewport ${innerHeight})`);
      scrollTo(0, 0);
    }
    for (const dlg of document.querySelectorAll("dialog[open]")) {
      const r = dlg.getBoundingClientRect();
      if (r.top < -1 || r.bottom > vh + 1 || r.left < -1 || r.right > vw + 1) out.push(`modal outside the viewport: ${label(dlg)} (${Math.round(r.top)} to ${Math.round(r.bottom)} of ${vh})`);
    }
    return out;
  }, { vw: d.width, vh: d.height });
  return [...problems, ...errors.splice(0)].map((p) => `${name}: ${p}`);
}

async function open(browser: Browser, d: Device, storageState?: State) {
  const ctx = await browser.newContext({
    baseURL: "http://localhost:3100", storageState, viewport: { width: d.width, height: d.height },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  // Realtime is not started by the local stack (LiveRefresh falls back to polling), so its socket failing is not a bug.
  page.on("console", (m) => m.type() === "error" && !m.text().includes("/realtime/v1/websocket") && errors.push(`console error: ${m.text()}`));
  return { ctx, page, errors };
}

for (const d of DEVICES) {
  test(`${d.name}: every screen fits`, async ({ browser }) => {
    test.setTimeout(240_000);
    const problems: string[] = [];
    const visit = async (state: State | undefined, who: string, screens: [string, string][], after?: (page: Page, name: string) => Promise<void>) => {
      const { ctx, page, errors } = await open(browser, d, state);
      for (const [name, path] of screens) {
        await page.goto(path);
        problems.push(...(await inspect(page, d, `${who}-${name}`, errors)));
      }
      if (after) await after(page, who);
      await ctx.close();
    };
    await visit(undefined, "visitor", [["landing", "/"], ["login", "/login"], ["decide", `/decide/${token}`], ["join", invitePath]]);
    const app: [string, string][] = [["home", "/"], ["schedule", "/schedule"], ["budget", "/budget"], ["leaderboard", "/leaderboard"]];
    await visit(mateState, "mate", app);
    await visit(adminState, "admin", app, async (page, who) => {
      await page.goto("/");
      const more = page.getByRole("button", { name: /^See more/ }).first();
      await more.click({ timeout: 10_000 });
      await expect(page.locator("dialog[open]")).toBeVisible();
      problems.push(...(await inspect(page, d, `${who}-see-more`, [])));
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
