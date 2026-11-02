import { expect, test } from "@playwright/test";
import { newUser, signIn } from "./helpers";

const stamp = Date.now();

test("the schedule board has the days as columns and the housemates as rows", async ({ browser }) => {
  const admin = await newUser(browser);
  await signIn(admin.page, `bo-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Orient House");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  const mate = await newUser(browser);
  await signIn(mate.page, `bo-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, bo-mate${stamp}`)).toBeVisible();

  await admin.page.goto("/schedule");
  await expect(admin.page.locator("thead th[scope=col] .eyebrow")).toHaveText(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const rows = admin.page.locator("tbody th[scope=row]");
  await expect(rows).toHaveCount(2); // the one housemate and Unassigned
  await expect(rows.first()).toContainText(`bo-mate${stamp}`);
  await expect(rows.last()).toContainText("Unassigned");
});
