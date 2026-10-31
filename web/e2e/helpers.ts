import { execSync } from "node:child_process";
import { expect, type Browser, type Page } from "@playwright/test";

const MAIL = process.env.E2E_MAIL_URL!;

// Asks for a magic link, reads it from the local mailbox and opens it in the same browser context.
export async function signIn(page: Page, email: string, next = "/") {
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

export async function newUser(browser: Browser) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:3100" });
  return { ctx, page: await ctx.newPage() };
}

// The sender issues decision tokens in production; here the test plays the sender straight against the local database.
export const psql = (sql: string) =>
  execSync(`docker exec supabase_db_apartment-manager psql -U postgres -At -c "${sql.replace(/\s+/g, " ")}"`, { encoding: "utf8" }).trim().split("\n")[0];

export function issueToken(mateName: string) {
  return psql(`select public.issue_decision_token(c.id) from public.claim c
    join public.member m on m.user_id = c.member_id and m.display_name = '${mateName}'
    where c.status = 'pending' limit 1`);
}
