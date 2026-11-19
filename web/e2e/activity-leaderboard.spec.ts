import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();
const shot = (name: string) => process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/${name}.png` : undefined;

test("a leaderboard card opens to that housemate's heatmap, on the lime lead card too", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `actlb-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Activity Board ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `actlb-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, actlb-mate${stamp}`)).toBeVisible();

  // Worst cases: the leader did 50 deeds today, the household's first entry is 20 days old, and an admin who lives there has none.
  psql(`update public.member set also_housemate = true where display_name = 'Boss' and household_id =
    (select household_id from public.member where display_name = 'actlb-mate${stamp}')`);
  psql(`insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
    select m.household_id, m.user_id, d.id, v.p, 'admin', m.user_id, now() - v.ago
    from public.member m,
    lateral (select id from public.deed where household_id = m.household_id limit 1) d,
    (select 3 as p, interval '0' as ago from generate_series(1, 50) union all select 5, interval '20 days') v
    where m.display_name = 'actlb-mate${stamp}'`);

  const page = mate.page;
  await page.goto("/leaderboard?p=this_week");
  const lead = page.locator("[data-flip-id]").filter({ hasText: `actlb-mate${stamp}` });
  await lead.locator(":scope > button").click();
  const heat = lead.getByRole("group", { name: "Activity" });
  await expect(heat.getByTestId("activity-total")).toHaveText("51 deeds in the last 12 months");
  await expect(heat.locator("[data-today]")).toHaveAttribute("data-level", "4");
  await expect(heat.getByRole("button", { name: "Previous" })).toBeDisabled(); // nothing older than the first entry

  const boss = page.locator("[data-flip-id]").filter({ hasText: "Boss" });
  await boss.locator(":scope > button").click();
  await expect(boss.getByRole("group", { name: "Activity" }).getByTestId("activity-total")).toHaveText("0 deeds in the last 12 months");

  // Points on the busiest day of a week: 150 still fits its cell at phone width.
  await heat.getByLabel("Measure").selectOption("points");
  await heat.getByRole("button", { name: "Week" }).click();
  await expect(heat.getByTestId("activity-total")).toContainText("150 points");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const today = heat.locator("[data-today]");
  expect(await today.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await today.locator(".display").evaluate((el) => el.getClientRects().length === 1 && (el as HTMLElement).offsetHeight < 2 * parseFloat(getComputedStyle(el).fontSize))).toBe(true); // one line

  if (process.env.SHOT_DIR) {
    for (const [w, h, tag] of [[390, 844, "phone"], [820, 1180, "tablet"]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const v of ["Week", "12 months"]) {
          await heat.getByRole("button", { name: v, exact: true }).click();
          await page.waitForTimeout(400);
          if (v === "12 months") await heat.locator("[data-today]").hover();
          await lead.screenshot({ path: shot(`lb-${tag}-${scheme}-${v === "Week" ? "week" : "year"}`) });
        }
      }
      await boss.screenshot({ path: shot(`lb-${tag}-empty`) });
    }
  }
});
