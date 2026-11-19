import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();
const shot = (name: string) => process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/${name}.png` : undefined;

test("Home heatmap counts deeds and points per day, by view, at phone and tablet widths", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `act-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Activity House ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `act-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, act-mate${stamp}`)).toBeVisible();

  // Today: three +2 deeds and a -1 penalty (never counts). Twenty days ago: one +5, outside this week and last week.
  psql(`insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
    select m.household_id, m.user_id, d.id, v.p, 'admin', m.user_id, now() - v.ago
    from public.member m,
    lateral (select id from public.deed where household_id = m.household_id limit 1) d,
    (values (2, interval '0'), (2, interval '0'), (2, interval '0'), (-1, interval '0'), (5, interval '20 days')) v (p, ago)
    where m.display_name = 'act-mate${stamp}'`);

  const page = mate.page;
  await page.reload();
  const card = page.getByRole("region", { name: "Activity" });
  const total = card.getByTestId("activity-total");
  await expect(card.getByRole("button", { name: "12 months" })).toHaveAttribute("aria-pressed", "true");
  await expect(total).toHaveText("4 deeds in the last 12 months");
  await expect(card.locator("[data-today]")).toHaveAttribute("data-level", "4");
  await expect(card.getByRole("button", { name: "Next" })).toBeDisabled();

  await card.getByLabel("Measure").selectOption("points");
  await expect(total).toHaveText("11 points in the last 12 months");

  await card.getByRole("button", { name: "Week" }).click();
  await expect(card.locator("[data-day]")).toHaveCount(7);
  await expect(total).toContainText("6 points");
  await card.getByRole("button", { name: "Previous" }).click();
  await expect(total).toContainText("0 points");
  await card.getByRole("button", { name: "Today" }).click();
  await expect(total).toContainText("6 points");

  await card.getByRole("button", { name: "Month", exact: true }).click();
  await expect.poll(() => card.locator("[data-day]").count()).toBeGreaterThanOrEqual(28);
  await card.getByRole("button", { name: "Year", exact: true }).click();
  await expect.poll(() => card.locator("[data-day]").count()).toBeGreaterThanOrEqual(365);

  // Phone: the year grid scrolls inside the card, the page never scrolls sideways.
  await card.getByRole("button", { name: "12 months" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scroller = card.getByTestId("activity-scroll");
  expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await card.scrollIntoViewIfNeeded();
  if (shot("activity-phone")) await card.screenshot({ path: shot("activity-phone") });

  // Tablet: the whole year fits with no scroll.
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect.poll(() => scroller.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  if (shot("activity-tablet")) await card.screenshot({ path: shot("activity-tablet") });

  // Review shots only: dark mode, the tooltip, Month and Week, at tablet and phone widths.
  if (process.env.SHOT_DIR) {
    await page.emulateMedia({ colorScheme: "dark" });
    await card.locator("[data-today]").hover();
    await expect(card.getByRole("status")).toContainText("3 deeds");
    await card.screenshot({ path: shot("activity-tablet-dark-tooltip") });
    for (const [w, h, tag] of [[820, 1180, "tablet"], [390, 844, "phone"]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const v of ["Month", "Week"]) {
          await card.getByRole("button", { name: v, exact: true }).click();
          await expect.poll(() => card.locator("[data-day]").count()).toBeLessThan(40);
          await page.waitForTimeout(400);
          await card.screenshot({ path: shot(`activity-${tag}-${scheme}-${v.toLowerCase()}`) });
        }
        await card.getByRole("button", { name: "12 months" }).click();
        await page.waitForTimeout(400);
        await card.screenshot({ path: shot(`activity-${tag}-${scheme}-year`) });
      }
    }
  }
});
