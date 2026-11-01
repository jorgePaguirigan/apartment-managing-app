import { expect, test } from "@playwright/test";
import { newUser, signIn } from "./helpers";

const stamp = Date.now();

test("the Chores card adds catalog deeds to the schedule and takes them off again", async ({ browser }) => {
  const admin = await newUser(browser);
  await signIn(admin.page, `cc-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Card House");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  const mate = await newUser(browser);
  await signIn(mate.page, `cc-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, cc-mate${stamp}`)).toBeVisible();
  await admin.page.goto("/schedule");

  const chores = admin.page.locator("section", { has: admin.page.getByRole("heading", { name: "Chores" }) });
  const upper = chores.getByRole("region", { name: "On the schedule" });
  const lower = chores.getByRole("region", { name: "From the catalog" });
  const board = admin.page.locator("tbody");
  await expect(chores.locator("input")).toHaveCount(0);
  await expect(lower.getByText("Cleaned toilet", { exact: true })).toBeVisible();
  await expect(upper.getByText("Cleaned toilet", { exact: true })).toHaveCount(0);
  await expect(board.getByText("Cleaned toilet", { exact: true })).toHaveCount(0);

  // The card moves before the server answers: hold every server action for 3 s.
  await admin.page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await lower.getByRole("button", { name: /^Add Cleaned toilet/ }).click();
  await expect(upper.getByText("Cleaned toilet", { exact: true })).toBeVisible({ timeout: 1000 });
  await expect(lower.getByText("Cleaned toilet", { exact: true })).toHaveCount(0);
  await admin.page.unrouteAll({ behavior: "wait" });

  await admin.page.reload();
  await expect(upper.getByText("Cleaned toilet", { exact: true })).toBeVisible();
  await expect(board.getByText("Cleaned toilet", { exact: true })).toBeVisible();
  if (process.env.SHOT_DIR) {
    await chores.scrollIntoViewIfNeeded();
    await chores.screenshot({ path: `${process.env.SHOT_DIR}/chores-card.png` });
    await admin.page.emulateMedia({ colorScheme: "dark" });
    await admin.page.setViewportSize({ width: 390, height: 844 });
    await chores.getByRole("region", { name: "From the catalog" }).scrollIntoViewIfNeeded();
    await admin.page.screenshot({ path: `${process.env.SHOT_DIR}/chores-card-phone-dark.png` });
    await admin.page.emulateMedia({ colorScheme: "light" });
    await admin.page.setViewportSize({ width: 1280, height: 720 });
  }

  await upper.getByRole("button", { name: /^Remove Cleaned toilet/ }).click();
  await expect(upper.getByText("Cleaned toilet", { exact: true })).toHaveCount(0);
  await expect(lower.getByText("Cleaned toilet", { exact: true })).toBeVisible();
  await admin.page.reload();
  await expect(lower.getByText("Cleaned toilet", { exact: true })).toBeVisible();
  await expect(board.getByText("Cleaned toilet", { exact: true })).toHaveCount(0);
});
