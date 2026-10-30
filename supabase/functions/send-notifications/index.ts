// Sends the claim emails waiting in the notification outbox. Woken every minute by a cron job (see the
// notification_sender migration), which proves who it is with a shared secret in the x-cron-secret header.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import nodemailer from "npm:nodemailer@6.9.16";
import { groupForMail, renderAdminEmail, renderDigestEmail, type AdminClaim, type Decision } from "./render.ts";

const env = (k: string) => Deno.env.get(k) ?? "";

Deno.serve(async (req) => {
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return new Response("unauthorized", { status: 401 });

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const user = env("GMAIL_USER");
  // SMTP_HOST, SMTP_PORT and SMTP_SECURE exist so a local run can use the local mail catcher instead of Gmail.
  const transport = nodemailer.createTransport({
    host: env("SMTP_HOST") || "smtp.gmail.com",
    port: Number(env("SMTP_PORT") || 465),
    secure: env("SMTP_SECURE") !== "false",
    auth: env("SMTP_HOST") ? undefined : { user, pass: env("GMAIL_APP_PASSWORD") },
  });
  const app = env("APP_URL");

  const { data: rows, error } = await db.rpc("take_notifications", { p_limit: 100 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Admins on the same claim share one email, and so do housemates waiting on the same claims: first in to, the rest in cc.
  const groups = groupForMail(rows ?? []);

  let sent = 0, failed = 0;
  for (const { rows: group, lead, emails } of groups) {
    const row = lead[0];
    try {
      if (!emails.length) throw new Error("recipient has no email address");
      let mail;
      if (row.kind === "admin_claim") {
        const { data: token, error: e } = await db.rpc("issue_decision_token", { p_claim: row.claim_id });
        if (e) throw e;
        mail = renderAdminEmail({
          household: row.household, payload: row.payload as AdminClaim, appUrl: app,
          acceptUrl: `${app}/decide/${token}?do=accept`, rejectUrl: `${app}/decide/${token}?do=reject`,
        });
      } else {
        mail = renderDigestEmail({ household: row.household, payloads: lead.map((r) => r.payload as Decision), appUrl: app });
      }
      await transport.sendMail({ from: `Kasangga <${user || "notifier@localhost"}>`, to: emails[0], cc: emails.slice(1), ...mail });
      for (const r of group) await db.rpc("finish_notification", { p_id: r.id });
      sent++;
    } catch (e) {
      for (const r of group) await db.rpc("finish_notification", { p_id: r.id, p_error: String(e).slice(0, 500) });
      failed++;
    }
  }
  return Response.json({ sent, failed });
});
