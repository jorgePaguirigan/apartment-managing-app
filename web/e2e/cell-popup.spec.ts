import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

test("pressing a cell opens the chore popup and ticking a chore puts it in that cell", async ({ browser }) => {
  const admin = await newUser(browser);
  await signIn(admin.page, `cp-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`Popup House ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  const mate = await newUser(browser);
  await signIn(mate.page, `cp-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, cp-mate${stamp}`)).toBeVisible();

  const tz = "Pacific/Auckland"; // ahead of Manila: on a Sunday there it is already Monday, so Sunday shows locked
  psql(`update public.household set timezone = '${tz}' where name = 'Popup House ${stamp}'`);
  psql(`update public.chore set active = false where household_id = (select id from public.household where name = 'Popup House ${stamp}')`); // empty schedule
  await admin.page.goto("/schedule");
  const col = Number(psql(`select extract(dow from now() at time zone '${tz}')::int`)); // 0 = Sunday = first column
  const page = admin.page;
  const cell = (r: number) => page.locator("tbody tr").nth(r).locator("td").nth(col); // row 0 is the housemate, 1 is Unassigned
  const press = (name: string) => page.getByRole("button", { name: new RegExp(`^Add a chore for ${name}.* ${DAYS[col]} `) });
  const dialog = page.getByRole("dialog");
  const toilet = dialog.getByRole("checkbox", { name: /Cleaned toilet/ });
  const row = dialog.getByText("Cleaned toilet", { exact: true }); // a real press lands on the row, the checkbox itself is visually hidden

  await expect(page.getByRole("heading", { name: "Chores", exact: true })).toHaveCount(0); // the Chores table is gone
  await press(`cp-mate${stamp}`).click();
  await expect(dialog).toBeVisible();
  await expect(toilet).not.toBeChecked();

  // The card lands before the server answers: hold every server action for 3 s.
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await row.click();
  await expect(cell(0).getByText("Cleaned toilet", { exact: true })).toBeVisible({ timeout: 1000 });
  await expect(toilet).toBeChecked();
  await expect(dialog).toBeVisible(); // stays open for more
  await page.unrouteAll({ behavior: "wait" });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(cell(0).getByText("Cleaned toilet", { exact: true })).toBeVisible();

  // Pressing a ticked chore does nothing; the chore is never removed from the popup.
  await press(`cp-mate${stamp}`).click();
  await expect(toilet).toBeChecked();
  await row.click();
  await expect(toilet).toBeChecked();
  await expect(cell(0).getByText("Cleaned toilet", { exact: true })).toHaveCount(1);
  await page.keyboard.press("Escape");

  // The same chore in another cell of that day is shown as taken.
  await press("Unassigned").click();
  await expect(toilet).toBeDisabled();
  await expect(dialog.getByText(`cp-mate${stamp} has this`)).toBeVisible();
  await page.keyboard.press("Escape");

  // Moving straight to another cell opens that cell's popup, even right after Esc on the last one.
  await press(`cp-mate${stamp}`).click();
  await page.keyboard.press("Escape");
  await press("Unassigned").click();
  await page.waitForTimeout(300); // past the old popup's close timer
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toHaveAccessibleName(/Unassigned/);
  await page.keyboard.press("Escape");

  // Keyboard: the add buttons are one tab stop, and the arrow keys move between cells.
  await expect(page.locator('.cell-add[tabindex="0"]')).toHaveCount(1);
  await press(`cp-mate${stamp}`).focus();
  await page.keyboard.press("ArrowDown");
  await expect(press("Unassigned")).toBeFocused();

  // Days before today are locked: no popup there.
  for (let c = 0; c < col; c++) await expect(page.locator("tbody tr").first().locator("td").nth(c).getByRole("button")).toHaveCount(0);

  if (process.env.SHOT_DIR) {
    await press(`cp-mate${stamp}`).click();
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${process.env.SHOT_DIR}/popup.png` });
    await page.keyboard.press("Escape");
    await page.emulateMedia({ colorScheme: "dark" });
    await press("Unassigned").click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${process.env.SHOT_DIR}/popup-dark.png` });
    await page.keyboard.press("Escape");
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 390, height: 844 });
    await press(`cp-mate${stamp}`).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${process.env.SHOT_DIR}/popup-phone.png` });
  }
});
