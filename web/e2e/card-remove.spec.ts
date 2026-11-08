import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

test("the red X on a card removes the chore, for the admin and for the card's assignee", async ({ browser }) => {
  const admin = await newUser(browser);
  await signIn(admin.page, `cx-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Remove House ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  const mate = await newUser(browser);
  await signIn(mate.page, `cx-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, cx-mate${stamp}`)).toBeVisible();

  const tz = "Pacific/Auckland";
  psql(`update public.household set timezone = '${tz}' where name = 'Remove House ${stamp}'`);
  psql(`update public.chore set active = false where household_id = (select id from public.household where name = 'Remove House ${stamp}')`);
  const col = Number(psql(`select extract(dow from now() at time zone '${tz}')::int`));
  const page = admin.page;
  await page.goto("/schedule");
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: new RegExp(`^Add a chore for cx-mate${stamp}.* ${DAYS[col]} `) }).click();
  await dialog.getByText("Cleaned toilet", { exact: true }).click();
  await dialog.getByText("Cooked dinner", { exact: true }).click();
  await page.keyboard.press("Escape");
  await page.reload();

  const x = (p: typeof page, name: string) => p.getByRole("button", { name: `Remove ${name}` });
  // The assignee sees the X on their own card.
  await mate.page.goto("/schedule");
  await expect(x(mate.page, "Cooked dinner")).toBeVisible();
  const mateX = await x(mate.page, "Cooked dinner").boundingBox();
  const mateCard = await mate.page.getByText("Cooked dinner", { exact: true }).boundingBox();
  expect(mateX!.x).toBeGreaterThan(mateCard!.x); // sits in the card's right part
  await x(mate.page, "Cooked dinner").click();
  await expect(mate.page.getByText("Cooked dinner", { exact: true })).toHaveCount(0);

  // The admin: the card goes before the server answers, and stays gone after a reload.
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await x(page, "Cleaned toilet").click();
  await expect(page.getByText("Cleaned toilet", { exact: true })).toHaveCount(0, { timeout: 1000 });
  await page.unrouteAll({ behavior: "wait" });
  await page.reload();
  await expect(page.getByText("Cleaned toilet", { exact: true })).toHaveCount(0);
  expect(psql(`select count(*) from public.chore where active and household_id = (select id from public.household where name = 'Remove House ${stamp}')`)).toBe("0");
});
