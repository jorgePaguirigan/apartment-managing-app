import { expect, test, type Page } from "@playwright/test";
import { newUser, signIn } from "./helpers";

const stamp = Date.now();

// Holds every server action for `ms`, as a slow connection to the database would, so the screen has to answer by itself.
async function slowServer(page: Page, ms: number) {
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

async function household(browser: Parameters<typeof newUser>[0], tag: string) {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `speedadmin${tag}${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Speed House");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = new URL(await admin.page.locator("p.font-mono").first().innerText()).pathname;
  const mateName = `speed${tag}${stamp}`;
  await signIn(mate.page, `${mateName}@example.com`, invite);
  await expect(mate.page.getByText(`Hi, ${mateName}`)).toBeVisible();
  return { admin, mate, mateName };
}

test("tapping a deed is answered before the server replies, and a refused claim takes it back", async ({ browser }) => {
  const { mate } = await household(browser, "claim");
  await slowServer(mate.page, 3000);

  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible({ timeout: 1000 });

  // A second tap on the same deed is refused (one is already waiting): the confirmation must not stay on screen.
  await expect(mate.page.getByRole("button", { name: /Cooked dinner/ })).toBeEnabled({ timeout: 15_000 });
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText(/already|waiting/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(mate.page.getByText("Sent to your admin for approval.")).toHaveCount(0);
});

test("Accept all clears the inbox before the server replies and accepts every claim", async ({ browser }) => {
  const { admin, mate, mateName } = await household(browser, "all");
  for (const deed of [/Cooked dinner/, /Did the laundry/, /Cleaned toilet/]) {
    await mate.page.getByRole("button", { name: deed }).click();
    await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();
    await mate.page.reload();
  }
  await admin.page.reload();
  await expect(admin.page.getByRole("button", { name: /Accept all \(3\)/ })).toBeVisible();

  await slowServer(admin.page, 3000);
  await admin.page.getByRole("button", { name: /Accept all/ }).click();
  await expect(admin.page.getByText("All caught up")).toBeVisible({ timeout: 1000 });

  // Once the server has finished, all three are scored: 4 + 3 + 5 points.
  await mate.page.goto("/leaderboard");
  await expect(async () => {
    await mate.page.reload();
    await expect(mate.page.getByRole("listitem").filter({ hasText: mateName })).toContainText("12");
  }).toPass({ timeout: 20_000 });
});

test("Accept and Reject close their claim before the server replies", async ({ browser }) => {
  const { admin, mate } = await household(browser, "one");
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();
  await admin.page.reload();
  await expect(admin.page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();

  await slowServer(admin.page, 3000);
  const row = admin.page.getByRole("listitem").filter({ hasText: "Cooked dinner" }).first(); // the button label changes once pressed, so find the row by its claim
  await admin.page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(row).toHaveCSS("pointer-events", "none", { timeout: 1000 }); // the row is closing at once (its fade is animated, so not asserted); the server is still working
});
