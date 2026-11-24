import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();
const shot = (name: string) => process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/${name}.png` : undefined;

// Awards for the housemate, `days` days ago each (0 is now).
const award = (name: string, days: number[]) => psql(`insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by, created_at)
  select m.household_id, m.user_id, d.id, 2, 'admin', m.user_id, now() - make_interval(days => v.ago)
  from public.member m, lateral (select id from public.deed where household_id = m.household_id limit 1) d,
  unnest(array[${days.join(",")}]) v (ago)
  where m.display_name = '${name}'`);

test("Home shows the day streak pill in the banner's top right: smoke before today's deed, sparks after", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  const name = `streak-mate${stamp}`;
  await signIn(admin.page, `streak-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Streak House ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `${name}@example.com`, new URL(invite).pathname);
  const page = mate.page;
  const pill = page.getByTestId("streak");

  // Nothing yet.
  await expect(pill).toHaveText("No streak");
  await expect(pill).toHaveAttribute("data-fire", "smoke");

  // Three days in a row up to yesterday, nothing today: alive, smoking.
  award(name, [1, 2, 3]);
  await page.reload();
  await expect(pill).toHaveText("3-day streak");
  await expect(pill).toHaveAttribute("aria-label", "3-day streak, today not done yet");
  await expect(pill).toHaveAttribute("data-fire", "smoke");
  await expect(pill.locator(".streak-puff")).toHaveCount(4);

  // Top right of the banner: level with the greeting and to its right, above the points.
  const box = async (text: string) => (await page.getByText(text, { exact: true }).first().boundingBox())!;
  const [p, hi, pts] = [(await pill.boundingBox())!, await box(`Hi, ${name}`), await box("points this week")];
  expect(p.x).toBeGreaterThan(hi.x + hi.width);
  expect(p.y).toBeLessThan(pts.y);
  await page.screenshot({ path: shot("streak-smoke") });

  // Today's deed lands and the page refreshes in place (as LiveRefresh does): sparks, with one burst.
  award(name, [0]);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(pill).toHaveText("4-day streak");
  await expect(pill).toHaveAttribute("aria-label", "4-day streak");
  await expect(pill).toHaveAttribute("data-fire", "spark");
  await expect(pill.locator(".streak-burst")).toHaveCount(12);
  await expect(pill.locator(".streak-spark:not(.streak-burst)")).toHaveCount(7);
  await page.screenshot({ path: shot("streak-spark") });

  // A fresh load shows sparks without the burst.
  await page.reload();
  await expect(pill).toHaveAttribute("data-fire", "spark");
  await expect(pill.locator(".streak-burst")).toHaveCount(0);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot("streak-dark") });
  await page.emulateMedia({ colorScheme: "light" });

  // Smallest phone: still beside the greeting, and nothing scrolls sideways.
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(pill).toBeVisible();
  const narrow = (await pill.boundingBox())!;
  expect(narrow.x + narrow.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: shot("streak-320") });

  // Reduced motion: no particles; the flame alone shows the state.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(pill.locator(".streak-fx")).toBeHidden();

  await admin.ctx.close();
  await mate.ctx.close();
});
