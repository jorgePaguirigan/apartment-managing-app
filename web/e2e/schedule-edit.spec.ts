import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();

test("the admin can move a card on today's row and it stays after a reload", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `ed-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Edit House");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `ed-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, ed-mate${stamp}`)).toBeVisible();

  const tz = process.env.E2E_TZ ?? "Pacific/Auckland"; // ahead of Manila: on a Sunday there it is already Monday, so Sunday shows locked
  psql(`update public.household set timezone = '${tz}' where name = 'Edit House'`);
  await admin.page.goto("/schedule");
  const row = Number(psql(`select extract(dow from now() at time zone '${tz}')::int`)); // 0 = Sunday = first row
  const today = admin.page.locator("tbody tr").nth(row);
  const card = today.locator("[draggable=true]").first();
  const name = await card.locator("p.font-semibold").innerText();
  await card.dragTo(today.locator("td").last()); // the Unassigned column
  await expect(today.locator("td").last().getByText(name, { exact: true })).toBeVisible();
  await admin.page.reload();
  await expect(today.locator("td").last().getByText(name, { exact: true })).toBeVisible();

  // Rows before today are locked: their cards cannot be dragged (there are none on a Sunday).
  for (let r = 0; r < row; r++) {
    const locked = admin.page.locator("tbody tr").nth(r);
    await expect(locked.locator("[draggable=true]")).toHaveCount(0);
    await expect(locked).toHaveAttribute("data-locked", "true");
  }
  await expect(today.locator("th").getByText("Today")).toBeVisible();
  await expect(today).not.toHaveAttribute("data-locked");
  if (process.env.SHOT_DIR) await admin.page.screenshot({ path: `${process.env.SHOT_DIR}/board.png`, fullPage: true });
  if (process.env.SHOT_DIR) {
    await admin.page.emulateMedia({ colorScheme: "dark" });
    await admin.page.screenshot({ path: `${process.env.SHOT_DIR}/board-dark.png`, fullPage: true });
    await admin.page.setViewportSize({ width: 390, height: 844 });
    await admin.page.screenshot({ path: `${process.env.SHOT_DIR}/board-phone-dark.png` });
    await admin.page.emulateMedia({ colorScheme: "light" });
    await admin.page.setViewportSize({ width: 1280, height: 720 });
  }

  // A card can also move to a later day of the week (not on a Saturday, the last row).
  if (row < 6) {
    // The board answers before the server does: hold every server action for 3 s.
    await admin.page.route("**/*", async (route) => {
      if (route.request().method() === "POST" && route.request().headers()["next-action"]) await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    const tomorrow = admin.page.locator("tbody tr").nth(row + 1).locator("td").last();
    await today.locator("td").last().locator("[draggable=true]", { hasText: name }).dragTo(tomorrow);
    await expect(tomorrow.getByText(name, { exact: true })).toBeVisible({ timeout: 1000 });
    await admin.page.unrouteAll({ behavior: "wait" });
    await admin.page.reload();
    await expect(admin.page.locator("tbody tr").nth(row + 1).locator("td").last().getByText(name, { exact: true })).toBeVisible();
  }
});
