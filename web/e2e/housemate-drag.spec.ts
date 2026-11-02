import { expect, test } from "@playwright/test";
import { newUser, signIn } from "./helpers";

const stamp = Date.now();

test("a housemate drags an unassigned chore onto their own row and back, and the admin sees it", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `hd-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Drag House ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `hd-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, hd-mate${stamp}`)).toBeVisible();

  // Next week is still in the dibs window, so its chores are unassigned and a dibbed one can be released.
  const rows = (p: typeof mate.page) => ({ mine: p.locator("tbody tr").first(), open: p.locator("tbody tr").last() });
  await mate.page.goto("/schedule?w=next");
  await expect(mate.page.locator("tbody th[scope=row]")).toHaveCount(2); // my row and Unassigned, even before I have a chore
  await expect(rows(mate.page).open.locator("th")).toContainText("Unassigned");

  const m = rows(mate.page);
  const cell = m.open.locator("td", { has: mate.page.locator("[draggable=true]") }).first();
  const col = await cell.evaluate((td) => (td as HTMLTableCellElement).cellIndex);
  const name = await cell.locator("p.font-semibold").first().innerText();
  await cell.locator("[draggable=true]").first().dragTo(m.mine.locator("td").nth(col - 1));
  await expect(m.mine.locator("td").nth(col - 1).getByText(name, { exact: true })).toBeVisible();

  if (process.env.SHOT_DIR) { await mate.page.emulateMedia({ colorScheme: "dark" }); await mate.page.screenshot({ path: `${process.env.SHOT_DIR}/mate-board.png`, fullPage: true }); }

  // The admin's board has it on the housemate's row.
  await admin.page.goto("/schedule?w=next");
  await expect(rows(admin.page).mine.locator("td").nth(col - 1).getByText(name, { exact: true })).toBeVisible();

  // And back: a dibbed card can be released by dragging it to Unassigned.
  await mate.page.reload();
  await expect(async () => { // the page may not be interactive yet right after a reload: drag again until it lands
    await m.mine.locator("td").nth(col - 1).locator("[draggable=true]", { hasText: name }).dragTo(m.open.locator("td").nth(col - 1));
    await expect(m.open.locator("td").nth(col - 1).getByText(name, { exact: true })).toBeVisible({ timeout: 1500 });
  }).toPass();
  await admin.page.reload();
  await expect(rows(admin.page).open.locator("td").nth(col - 1).getByText(name, { exact: true })).toBeVisible();

  // Cards that are not theirs to take cannot be dragged to another day.
  await expect(mate.page.locator("td[data-drop]")).toHaveCount(0);
});
