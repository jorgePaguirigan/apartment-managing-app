import { expect, test } from "@playwright/test";
import { newUser, signIn } from "./helpers";

const stamp = Date.now();

test("the schedule page never scrolls sideways past the UI", async ({ browser }) => {
  const admin = await newUser(browser);
  await signIn(admin.page, `ns-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Scroll House");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  const mate = await newUser(browser);
  await signIn(mate.page, `ns-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, ns-mate${stamp}`)).toBeVisible();

  for (const [w, h] of [[1280, 800], [390, 800]]) {
    await admin.page.setViewportSize({ width: w, height: h });
    await admin.page.goto("/schedule");
    await expect(admin.page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible();
    await admin.page.mouse.wheel(600, 0);
    await admin.page.evaluate(() => scrollTo(5000, 0));
    const m = await admin.page.evaluate(() => ({ x: scrollX, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    console.log(w, JSON.stringify(m));
    expect(m.x, `page scrolled sideways at ${w}px`).toBe(0);
    expect(m.sw).toBeLessThanOrEqual(m.cw);
  }
});
