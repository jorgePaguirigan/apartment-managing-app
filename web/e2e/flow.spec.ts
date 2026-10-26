import { execSync } from "node:child_process";
import { expect, test, type Browser, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL!;
const stamp = Date.now();

// Asks for a magic link, reads it from the local mailbox and opens it in the same browser context.
async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  let link = "";
  await expect(async () => {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const id = list.messages?.[0]?.ID;
    expect(id).toBeTruthy();
    const msg = await (await fetch(`${MAIL}/api/v1/message/${id}`)).json();
    link = String(msg.Text).match(/https?:\/\/\S+/)?.[0] ?? "";
    expect(link).toContain("/auth/v1/verify");
  }).toPass();
  await page.goto(link);
}

async function newUser(browser: Browser) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:3100" });
  return { ctx, page: await ctx.newPage() };
}

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
  await expect(admin.page.getByText(`${mateName} did Cooked dinner`)).toBeVisible();
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

// The sender issues decision tokens in production; here the test plays the sender straight against the local database.
function issueToken(mateName: string) {
  const sql = `select public.issue_decision_token(c.id, a.user_id) from public.claim c
    join public.member m on m.user_id = c.member_id and m.display_name = '${mateName}'
    join public.member a on a.household_id = c.household_id and a.role = 'admin'
    where c.status = 'pending' limit 1`;
  return execSync(`docker exec supabase_db_apartment-manager psql -U postgres -At -c "${sql.replace(/\s+/g, " ")}"`, { encoding: "utf8" }).trim().split("\n")[0];
}

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
  await expect(visitor.page.getByRole("heading", { name: `${mateName} did Cooked dinner` })).toBeVisible();
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
