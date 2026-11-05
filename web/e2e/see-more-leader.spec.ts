import { expect, test } from "@playwright/test";
import { newUser, psql, signIn } from "./helpers";

const stamp = Date.now();

test("See more on the leader's card keeps the page colors, not the card's dark ink", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  await signIn(admin.page, `sm-admin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill(`SeeMore House ${stamp}`);
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `sm-mate${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, sm-mate${stamp}`)).toBeVisible();

  // History shows 10 rows; an 11th and 12th make See more appear. The only housemate is the leader.
  psql(`insert into public.score_entry (household_id, member_id, deed_id, points, source, approved_by)
    select m.household_id, m.user_id, d.id, d.points, 'admin', m.user_id
    from public.member m, generate_series(1, 12) g,
    lateral (select id, points from public.deed where household_id = m.household_id and active and points > 0 limit 1) d
    where m.display_name = 'sm-mate${stamp}'`);

  await mate.page.emulateMedia({ colorScheme: "dark" });
  await mate.page.goto("/leaderboard?p=all");
  await mate.page.locator("[data-flip-id] > button").first().click();
  await mate.page.getByRole("button", { name: /See more/ }).click();
  const dialog = mate.page.getByRole("dialog", { name: "History" });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveCSS("color", "rgb(22, 23, 27)"); // the leader card's .on-accent ink
  await expect(dialog).toHaveCSS("opacity", "1"); // the open animation has finished
  if (process.env.SHOT_DIR) await mate.page.screenshot({ path: `${process.env.SHOT_DIR}/see-more-dark.png` });
  await mate.page.keyboard.press("Escape"); // still a native modal after the move
  await expect(dialog).toBeHidden();
});
