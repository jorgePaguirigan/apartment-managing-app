import { expect, test } from "@playwright/test";
import { issueToken, newUser, psql, signIn } from "./helpers";

const stamp = Date.now();

test("claim, approve, leaderboard and budget across admin and housemate", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  const adminEmail = `admin${stamp}@example.com`;
  const mateEmail = `mate${stamp}@example.com`;
  const mateName = `mate${stamp}`;

  // Admin signs in by magic link and creates the household.
  await signIn(admin.page, adminEmail);
  await expect(admin.page.getByRole("heading", { name: "Set up your household" })).toBeVisible();
  await admin.page.getByLabel("Household name").fill("Unit 4B");
  await admin.page.getByLabel("Your name").fill("Boss");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  expect(invite).toContain("/join/");

  // The housemate follows the invite link and is joined automatically.
  await signIn(mate.page, mateEmail, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, ${mateName}`)).toBeVisible();

  // One tap files a claim; the admin accepts it; the points land on the leaderboard.
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();
  await admin.page.reload();
  await expect(admin.page.getByText(`${mateName} Cooked dinner`)).toBeVisible();
  await admin.page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(admin.page.getByText("All caught up")).toBeVisible();
  await mate.page.goto("/leaderboard");
  await expect(mate.page.getByRole("listitem").filter({ hasText: mateName })).toContainText("4");
  // The admin is not a housemate: never ranked.
  await expect(mate.page.getByText("Boss")).toHaveCount(0);
  // A card's history follows the period on show: the claim is this week's, not last week's.
  const card = mate.page.getByRole("listitem").filter({ hasText: mateName });
  await card.getByRole("button").click();
  await expect(card.getByText("Cooked dinner")).toBeVisible();
  await mate.page.getByRole("link", { name: "Last week" }).click();
  await card.getByRole("button").click();
  await expect(card.getByText("No points last week.")).toBeVisible();
  await expect(card.getByText("Cooked dinner")).toHaveCount(0);

  // Budget: admin sets an envelope, the housemate spends from it, overspending turns negative.
  await admin.page.goto("/budget");
  await admin.page.getByPlaceholder("New category").fill("Wifi");
  await admin.page.getByPlaceholder("PHP / month").fill("1500");
  await admin.page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(admin.page.getByText("₱1,500.00").first()).toBeVisible();
  await mate.page.goto("/budget");
  await mate.page.getByLabel("Amount").fill("1800");
  await mate.page.getByRole("button", { name: "Log it" }).click();
  await expect(mate.page.getByText("-₱300.00").first()).toBeVisible();
  await expect(mate.page.getByRole("heading", { name: "Categories" })).toHaveCount(0); // admin only
  await expect(admin.page.getByRole("heading", { name: "Log spending" })).toHaveCount(0); // housemates only

  // An archived category keeps its history but is no longer offered for new spending.
  await admin.page.getByPlaceholder("New category").fill("Snacks");
  await admin.page.getByPlaceholder("PHP / month").fill("300");
  await admin.page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(admin.page.getByText("₱300.00").first()).toBeVisible();
  await admin.page.getByText("Snacks").last().click();
  await admin.page.getByRole("button", { name: "Archive" }).click();
  await mate.page.goto("/budget");
  await expect(mate.page.getByLabel("Category").locator("option")).toHaveText(["Wifi"]);

  // Last month shows nothing: these categories did not exist yet.
  await admin.page.goto("/budget?m=prev");
  await expect(admin.page.getByText("No categories yet")).toBeVisible();
});

test("an admin accepts a claim from the emailed link without signing in", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  const visitor = await newUser(browser); // no session at all
  const mateName = `link${stamp}`;

  await signIn(admin.page, `linkadmin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Unit 9C");
  await admin.page.getByLabel("Your name").fill("Chief");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `${mateName}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, ${mateName}`)).toBeVisible();
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();

  const token = issueToken(mateName);
  expect(token).toMatch(/^[0-9a-f]{64}$/);

  // Signed out: the page shows the claim, and nothing is decided until the button is pressed.
  await visitor.page.goto(`/decide/${token}?do=accept`);
  await expect(visitor.page.getByRole("heading", { name: `${mateName} Cooked dinner` })).toBeVisible();
  await expect(visitor.page.getByText("+4")).toBeVisible();
  await visitor.page.reload();
  await expect(visitor.page.getByRole("button", { name: "Accept" })).toBeVisible();

  await visitor.page.getByRole("button", { name: "Accept" }).click();
  await expect(visitor.page.getByRole("heading", { name: "Accepted" })).toBeVisible();
  await visitor.page.reload();
  await expect(visitor.page.getByRole("heading", { name: "Accepted" })).toBeVisible(); // a second visit cannot decide again
  await expect(visitor.page.getByRole("button", { name: "Reject" })).toHaveCount(0);

  await mate.page.goto("/leaderboard");
  await expect(mate.page.getByRole("listitem").filter({ hasText: mateName })).toContainText("4");

  // A made-up link shows nothing about any claim.
  await visitor.page.goto(`/decide/${"0".repeat(64)}`);
  await expect(visitor.page.getByRole("heading", { name: "Link not valid" })).toBeVisible();
});

test("with two admins the link asks who you are, and records that admin", async ({ browser }) => {
  const admin = await newUser(browser);
  const co = await newUser(browser);
  const mate = await newUser(browser);
  const visitor = await newUser(browser);
  const mateName = `pick${stamp}`;
  const coName = `co${stamp}`;

  await signIn(admin.page, `pickadmin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Unit 9D");
  await admin.page.getByLabel("Your name").fill("Chief");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(co.page, `${coName}@example.com`, new URL(invite).pathname);
  await expect(co.page.getByText(`Hi, ${coName}`)).toBeVisible();
  psql(`update public.member set role = 'admin' where display_name = '${coName}'`);
  await signIn(mate.page, `${mateName}@example.com`, new URL(invite).pathname);
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();

  await visitor.page.goto(`/decide/${issueToken(mateName)}`);
  const accept = visitor.page.getByRole("button", { name: "Accept" });
  await expect(visitor.page.getByText("Who are you?")).toBeVisible();
  await expect(accept).toBeDisabled();
  await visitor.page.getByRole("radio", { name: coName }).check({ force: true });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(visitor.page.getByRole("heading", { name: "Accepted" })).toBeVisible({ timeout: 20_000 });
  expect(psql(`select m.display_name from public.claim c join public.member m on m.user_id = c.decided_by where c.status = 'accepted' and c.member_id = (select user_id from public.member where display_name = '${mateName}')`)).toBe(coName);
});

test("an admin sets when housemates get the claim emails", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  const mateName = `sched${stamp}`;

  await signIn(admin.page, `schedadmin${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Unit 7D");
  await admin.page.getByLabel("Your name").fill("Lead");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `${mateName}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, ${mateName}`)).toBeVisible();

  // Right away until told otherwise.
  const p = admin.page;
  await expect(p.getByRole("heading", { name: "Email schedule" })).toBeVisible();
  await expect(p.getByText("Emails go out right away.")).toBeVisible();

  // Two set times: the first is offered as 21:00, the second added.
  await p.getByText("At set times", { exact: true }).click();
  await p.getByLabel("Send time 1", { exact: true }).fill("12:00");
  await p.getByRole("button", { name: "Add a time" }).click();
  await p.getByLabel("Send time 2", { exact: true }).fill("21:00");
  await expect(p.getByText("Emails go out at 12:00 and 21:00.")).toBeVisible();
  await p.getByRole("button", { name: "Save schedule" }).click();
  await p.reload();
  await expect(p.getByText("Emails go out at 12:00 and 21:00.")).toBeVisible();
  await expect(p.getByRole("radio", { name: "At set times" })).toBeChecked();

  // Back to right away, with quiet hours; the times become the quiet-hours send times.
  await p.getByText("Right away", { exact: true }).click();
  await p.getByLabel("Quiet hours").check();
  await expect(p.getByText("Emails go out right away, except from 19:00 to 07:00: those go out at 12:00 and 21:00, or when it ends, whichever is first.")).toBeVisible();
  await p.getByRole("button", { name: "Save schedule" }).click();
  await p.reload();
  await expect(p.getByLabel("Quiet hours")).toBeChecked();
  await expect(p.getByText("those go out at 12:00 and 21:00")).toBeVisible();

  // Housemates never see it.
  await mate.page.reload();
  await expect(mate.page.getByRole("heading", { name: "Email schedule" })).toHaveCount(0);
});

test("an admin makes a housemate an admin who can score claims but not their own", async ({ browser }) => {
  const admin = await newUser(browser);
  const mate = await newUser(browser);
  const mateName = `promo${stamp}`;

  await signIn(admin.page, `boss2${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Unit 5C");
  await admin.page.getByLabel("Your name").fill("Boss2");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(mate.page, `promo${stamp}@example.com`, new URL(invite).pathname);
  await expect(mate.page.getByText(`Hi, ${mateName}`)).toBeVisible();

  // Edit > Make admin asks once, then the card shows an Admin tag and loses its Edit button.
  await admin.page.reload();
  const row = admin.page.getByRole("listitem").filter({ hasText: mateName });
  await row.getByRole("button", { name: "Edit" }).click();
  await row.getByRole("button", { name: "Make admin" }).click();
  await row.getByRole("button", { name: "Make admin" }).last().click();
  await expect(row.getByText("Admin", { exact: true })).toBeVisible();

  // The promoted housemate sees the admin page, and cannot accept their own claim.
  await mate.page.reload();
  await expect(mate.page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await mate.page.getByRole("group", { name: "View" }).getByRole("button", { name: "Housemate" }).click();
  await mate.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(mate.page.getByText("Sent to your admin for approval.")).toBeVisible();
  await mate.page.getByRole("group", { name: "View" }).getByRole("button", { name: "Admin" }).click();
  await expect(mate.page.getByText(`${mateName} Cooked dinner`)).toBeVisible();
  await mate.page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(mate.page.getByText("Another admin has to decide your own claim.")).toBeVisible();
});

test("a claim with a contributor scores both housemates", async ({ browser }) => {
  const admin = await newUser(browser);
  const ana = await newUser(browser);
  const ben = await newUser(browser);
  const anaName = `ana${stamp}`;
  const benName = `ben${stamp}`;

  await signIn(admin.page, `boss3${stamp}@example.com`);
  await admin.page.getByLabel("Household name").fill("Unit 6D");
  await admin.page.getByLabel("Your name").fill("Boss3");
  await admin.page.getByRole("button", { name: "Create household" }).click();
  await admin.page.getByRole("button", { name: "New invite link" }).click();
  const invite = await admin.page.locator("p.font-mono").first().innerText();
  await signIn(ana.page, `${anaName}@example.com`, new URL(invite).pathname);
  await signIn(ben.page, `${benName}@example.com`, new URL(invite).pathname);
  await expect(ben.page.getByText(`Hi, ${benName}`)).toBeVisible();

  // Ana names Ben, then taps the deed. The picker counts her in: 2 of 2 people.
  await ana.page.reload();
  await expect(ana.page.getByRole("group", { name: "Contributors" })).toHaveCount(0); // closed until asked for
  await ana.page.getByRole("button", { name: /Contributors/ }).click();
  await expect(ana.page.getByRole("group", { name: "Contributors" })).toBeVisible();
  await ana.page.getByRole("group", { name: "Contributors" }).getByText(benName).click();
  await expect(ana.page.getByRole("button", { name: /Contributors/ })).toContainText(`With ${benName}`);
  await expect(ana.page.getByRole("button", { name: /Contributors/ })).toContainText("2/2");
  await ana.page.keyboard.press("Escape");
  await expect(ana.page.getByRole("group", { name: "Contributors" })).toHaveCount(0); // Escape closes it
  await ana.page.getByRole("button", { name: /Cooked dinner/ }).click();
  await expect(ana.page.getByText("Sent to your admin for approval.")).toBeVisible();
  await expect(ana.page.getByRole("button", { name: /Contributors/ })).toContainText("Just me");

  // The admin sees who was with Ana, accepts once, and both are scored.
  await admin.page.reload();
  await expect(admin.page.getByText(`With ${benName}`)).toBeVisible();
  await admin.page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(admin.page.getByText("All caught up")).toBeVisible();
  await ana.page.goto("/leaderboard");
  await expect(ana.page.getByRole("listitem").filter({ hasText: anaName })).toContainText("4");
  await expect(ana.page.getByRole("listitem").filter({ hasText: benName })).toContainText("4");

  // Ben's History has the claim as a normal card.
  await ben.page.goto("/");
  await expect(ben.page.getByText("Cooked dinner").last()).toBeVisible();
  await expect(ben.page.getByText("+4").last()).toBeVisible();
});

test("an admin who lives there too turns it on and off and switches view", async ({ browser }) => {
  const admin = await newUser(browser);
  const p = admin.page;
  await signIn(p, `boss4${stamp}@example.com`);
  await p.getByLabel("Household name").fill("Unit 7E");
  await p.getByLabel("Your name").fill("Boss4");
  await p.getByRole("button", { name: "Create household" }).click();

  // Off: one plain button, and no view switch yet.
  const join = p.getByRole("button", { name: "I live here too" });
  const stop = p.getByRole("button", { name: "Stop being a housemate" });
  await expect(stop).toHaveCount(0);
  await expect(p.getByRole("group", { name: "View" })).toHaveCount(0);

  // On at once, and the view switch appears.
  await join.click();
  await expect(stop).toBeVisible();
  const view = p.getByRole("group", { name: "View" });
  await expect(view.getByRole("button", { name: "Admin" })).toHaveAttribute("aria-pressed", "true");

  // Housemate view, kept across a reload; then back to admin.
  await view.getByRole("button", { name: "Housemate" }).click();
  await expect(p.getByRole("heading", { name: "I did…" })).toBeVisible();
  await p.reload();
  await expect(p.getByRole("group", { name: "View" }).getByRole("button", { name: "Housemate" })).toHaveAttribute("aria-pressed", "true");
  await p.getByRole("group", { name: "View" }).getByRole("button", { name: "Admin" }).click();
  await expect(p.getByRole("heading", { name: "Inbox" })).toBeVisible();

  // On a phone the view switch is still there.
  await p.setViewportSize({ width: 375, height: 800 });
  await expect(p.getByRole("group", { name: "View" })).toBeVisible();
  await p.setViewportSize({ width: 1280, height: 800 });

  // Turning it off asks first, because it takes them off the leaderboard. Cancel keeps it on.
  await stop.click();
  await expect(p.getByText("You leave the leaderboard and the schedule")).toBeVisible();
  await p.getByRole("button", { name: "Cancel" }).click();
  await expect(stop).toBeVisible();
  await stop.click();
  await p.getByRole("button", { name: "Turn off" }).click();
  await expect(join).toBeVisible();
  await expect(p.getByRole("group", { name: "View" })).toHaveCount(0);
});

test("an admin renames and deletes a catalog group, and its deeds stay", async ({ browser }) => {
  const admin = await newUser(browser);
  const p = admin.page;
  await signIn(p, `groups${stamp}@example.com`);
  await p.getByLabel("Household name").fill("Unit 5C");
  await p.getByLabel("Your name").fill("Boss");
  await p.getByRole("button", { name: "Create household" }).click();

  await p.getByLabel("Group name", { exact: true }).fill("Kitchen");
  await p.getByRole("button", { name: "Add group" }).click();
  const kitchen = p.getByRole("region", { name: "Kitchen" });
  await expect(kitchen).toBeVisible();

  // Rename it from the pencil beside its arrows.
  await p.getByRole("button", { name: "Edit Kitchen" }).click();
  await p.getByLabel("Rename Kitchen").fill("Dishes");
  await p.getByRole("button", { name: "Save", exact: true }).click();
  await expect(p.getByRole("region", { name: "Dishes" })).toBeVisible();
  await expect(p.getByRole("region", { name: "Kitchen" })).toHaveCount(0);

  // Delete asks first; Cancel keeps it. The deeds move to Ungrouped.
  await p.getByRole("button", { name: "Edit Dishes" }).click();
  await p.getByRole("button", { name: "Delete group" }).click();
  await p.getByRole("button", { name: "Cancel" }).click();
  await expect(p.getByRole("region", { name: "Dishes" })).toBeVisible();
  await p.getByRole("button", { name: "Delete group" }).click();
  await p.getByRole("button", { name: "Delete group" }).last().click();
  await expect(p.getByRole("region", { name: "Dishes" })).toHaveCount(0);
  await expect(p.getByRole("region", { name: "Ungrouped" }).getByText("Cooked dinner")).toBeVisible();
});

test("the catalog's See more counts only the deeds not shown", async ({ browser }) => {
  const admin = await newUser(browser);
  const p = admin.page;
  await signIn(p, `seemore${stamp}@example.com`);
  await p.getByLabel("Household name").fill("Unit 6D");
  await p.getByLabel("Your name").fill("Boss");
  await p.getByRole("button", { name: "Create household" }).click();

  // The starter catalog fits under the cap of 20 rows, so there is nothing to see more of.
  const rows = p.locator("[data-deed]");
  await expect(rows.first()).toBeVisible();
  const start = await rows.count();
  expect(start).toBeLessThan(20);
  await expect(p.getByRole("button", { name: /See more/ })).toHaveCount(0);

  let total = start;
  const add = async (to: number) => {
    for (; total < to; total++) {
      await p.getByLabel("Deed name").first().fill(`Extra ${total}`);
      await p.getByLabel("Points").first().fill("1");
      await p.getByRole("button", { name: "Add deed" }).click();
      await expect(p.getByText(`Extra ${total}`).first()).toBeVisible();
    }
  };
  // Exactly the cap: still no button. One over: one hidden, not the whole catalog.
  await add(20);
  await expect(p.getByRole("button", { name: /See more/ })).toHaveCount(0);
  await add(21);
  await expect(p.getByRole("button", { name: "See more (1)" })).toBeVisible();
  await add(24);
  await expect(p.getByRole("button", { name: "See more (4)" })).toBeVisible();
});
