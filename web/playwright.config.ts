import { execSync } from "node:child_process";
import { defineConfig } from "@playwright/test";

// Runs against a local Supabase (`supabase start`). Keys come from the environment, or from `supabase status`.
const status = () => Object.fromEntries(
  execSync("supabase status -o env", { cwd: "..", encoding: "utf8" })
    .split("\n").map((l) => l.match(/^(\w+)="?(.*?)"?$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => [m[1], m[2]]),
);
const s = process.env.E2E_SUPABASE_URL ? {} : status();
const url = process.env.E2E_SUPABASE_URL ?? s.API_URL;
const anon = process.env.E2E_SUPABASE_ANON_KEY ?? s.ANON_KEY;
process.env.E2E_MAIL_URL ??= s.INBUCKET_URL ?? "http://127.0.0.1:54424";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100/login",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon },
  },
});
