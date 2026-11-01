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

  await admin.page.goto("/schedule");
  const row = Number(psql("select extract(dow from now() at time zone 'Asia/Manila')::int")); // 0 = Sunday = first row
  const today = admin.page.locator("tbody tr").nth(row);
  const card = today.locator("[draggable=true]").first();
  const name = await card.locator("p.font-semibold").innerText();
  await card.dragTo(today.locator("td").last()); // the Unassigned column
  await expect(today.locator("td").last().getByText(name, { exact: true })).toBeVisible();
  await admin.page.reload();
  await expect(today.locator("td").last().getByText(name, { exact: true })).toBeVisible();

  // Rows before today are locked: their cards cannot be dragged (there are none on a Sunday).
  for (let r = 0; r < row; r++) await expect(admin.page.locator("tbody tr").nth(r).locator("[draggable=true]")).toHaveCount(0);

  // A card can also move to a later day of the week (not on a Saturday, the last row).
  if (row < 6) {
    const tomorrow = admin.page.locator("tbody tr").nth(row + 1).locator("td").last();
    await today.locator("td").last().locator("[draggable=true]", { hasText: name }).dragTo(tomorrow);
    await expect(tomorrow.getByText(name, { exact: true })).toBeVisible();
    await admin.page.reload();
    await expect(admin.page.locator("tbody tr").nth(row + 1).locator("td").last().getByText(name, { exact: true })).toBeVisible();
  }
});
