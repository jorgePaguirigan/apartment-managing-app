import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();

test("the schedule week runs Sunday to Saturday and a chore sits on its own day", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `wk-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Week House");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `wk-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, wk-mate${stamp}`)).toBeVisible();

  await admin.page.goto("/schedule");
  const days = admin.page.locator("thead th[scope=col] .eyebrow");
  await expect(days).toHaveText(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  // The first row is the Sunday that starts the week, in the household time zone.
  const sunday = psql("select public.period_start('week', now() at time zone 'Asia/Manila')::date");
  await expect(admin.page.locator("thead th[scope=col] .display").first()).toHaveText(String(Number(sunday.slice(8))));

  // A chore on Sunday (weekday 7) is the first column, one on Monday (weekday 1) the second.
  for (const [weekday, row] of [[7, 0], [1, 1]]) {
    const name = psql(`select c.name from public.chore c join public.household h on h.id = c.household_id
      where h.name = 'Week House' and c.weekday = ${weekday} and c.active limit 1`);
    expect(name).not.toBe("");
    await expect(admin.page.locator(`tbody tr td:nth-child(${row + 2})`).getByText(name, { exact: true }).first()).toBeVisible();
  }
});
