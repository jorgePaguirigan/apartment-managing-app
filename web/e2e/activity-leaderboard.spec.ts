import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();
const shot = (name: string) => process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/${name}.png` : undefined;

test("the leaderboard shows every scored housemate's heatmap below the cards, under one bar that follows the period", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  const mate2 = await newUser(browser);
  await signIn(admin.page, `actlb-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Activity Board ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = new URL(await admin.page.locator("p.font-mono").first().innerText()).pathname;
  await signIn(mate.page, `actlb-mate${stamp}@example.com`, invite);
  await expect(mate.page.getByText(`Hi, actlb-mate${stamp}`)).toBeVisible();
  await signIn(mate2.page, `actlb-two${stamp}@example.com`, invite);
  await expect(mate2.page.getByText(`Hi, actlb-two${stamp}`)).toBeVisible();

  // Three scored members: the leader did 50 deeds today, the second one deed a week ago, and an admin who lives there has none.
  psql(`update public.member set also_housemate = true where display_name = 'Boss' and household_id =
    (select household_id from public.member where display_name = 'actlb-mate${stamp}')`);
  psql(`insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
    select m.household_id, m.user_id, d.id, v.p, 'admin', m.user_id, now() - v.ago
    from public.member m,
    lateral (select id from public.deed where household_id = m.household_id limit 1) d,
    (select 3 as p, interval '0' as ago, 'actlb-mate' as who from generate_series(1, 50)
     union all select 4, interval '7 days', 'actlb-two') v
    where m.display_name = v.who || '${stamp}'`);

  const page = mate.page;
  await page.goto("/leaderboard?p=this_week");
  const section = page.getByRole("region", { name: "Activity" });
  const grids = section.getByRole("listitem").filter({ has: page.getByTestId("activity-total") });

  // One heatmap per scored member, below the cards, in leaderboard order.
  await expect(grids).toHaveCount(3);
  const cardNames = await page.locator("[data-flip-id]").evaluateAll((els) => els.map((e) => e.textContent ?? ""));
  const gridNames = await grids.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  expect(gridNames.map((g) => cardNames.findIndex((c) => c.includes(g)))).toEqual([0, 1, 2]);
  const below = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-flip-id]")].at(-1)!.getBoundingClientRect().bottom;
    return document.querySelector("section[aria-labelledby]:has([data-testid=activity-total])")!.getBoundingClientRect().top >= cards;
  });
  expect(below).toBe(true);

  // "This week" opens on this week; the bar moves all three.
  await expect(section.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
  await expect(grids.nth(0).getByTestId("activity-total")).toContainText("50 deeds");
  await section.getByRole("button", { name: "12 months" }).click();
  await expect(grids.filter({ hasText: `actlb-two${stamp}` }).locator("[data-level='1']")).toHaveCount(1); // one deed next to 50 is the faintest step, not the darkest
  await section.getByRole("button", { name: "Week" }).click();
  await expect(section.locator("[data-day]")).toHaveCount(21);
  await section.getByRole("button", { name: "Month", exact: true }).click();
  await expect.poll(() => section.locator("[data-day]").count()).toBeGreaterThanOrEqual(84);
  await expect(section.getByRole("button", { name: "Month", exact: true })).toHaveAttribute("aria-pressed", "true");

  // "Last week" opens on last week, where only the second housemate did something.
  await page.getByRole("link", { name: "Last week" }).click();
  await expect(page).toHaveURL(/p=prev_week/);
  await expect(section.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
  const two = grids.filter({ hasText: `actlb-two${stamp}` });
  await expect(two.getByTestId("activity-total")).toContainText("1 deed");
  await expect(grids.filter({ hasText: `actlb-mate${stamp}` }).getByTestId("activity-total")).toContainText("0 deeds");

  // A card folds open to history only.
  const lead = page.locator("[data-flip-id]").first();
  await lead.locator(":scope > button").click();
  await expect(lead.locator("[data-day]")).toHaveCount(0);

  // The admin who lives there switches views on Home, but the leaderboard has no switch.
  await admin.page.goto("/");
  await expect(admin.page.getByRole("group", { name: "View" })).toBeVisible();
  await admin.page.goto("/leaderboard");
  await expect(admin.page.getByRole("region", { name: "Activity" })).toBeVisible();
  await expect(admin.page.getByRole("group", { name: "View" })).toHaveCount(0);

  // Phone: no sideways page scroll with three year grids.
  await section.getByRole("button", { name: "12 months" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  if (process.env.SHOT_DIR) {
    await page.addStyleTag({ content: ".mm-walk, .mm-breathe { visibility: hidden !important; }" });
    await page.goto("/leaderboard?p=this_week");
    await page.addStyleTag({ content: ".mm-walk, .mm-breathe { visibility: hidden !important; }" });
    for (const [w, h, tag] of [[1280, 1400, "desktop"], [390, 1500, "phone"]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(500);
        await page.screenshot({ path: shot(`lb3-${tag}-${scheme}`), fullPage: true });
      }
    }
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 1280, height: 1400 });
    await section.getByRole("button", { name: "12 months" }).click();
    await page.waitForTimeout(500);
    await section.screenshot({ path: shot("lb3-desktop-year") });
  }
});
