// Tests for the email renderer. Run with `node --test supabase/functions/send-notifications/render.test.ts`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { groupForMail, renderAdminEmail, renderDigestEmail, renderHousemateEmail, type AdminClaim, type Decision } from "./render.ts";

const APP = "https://kasangga.vercel.app";
const week = {
  before: [{ name: "Ben", points: 4, rank: 1 }, { name: "Maria", points: 3, rank: 2 }],
  after: [{ name: "Maria", points: 8, rank: 1 }, { name: "Ben", points: 4, rank: 2 }],
  overtaken: [{ name: "Ben", by: "Maria" }],
};
const month = { ...week, overtaken: [] };
const accepted: Decision = {
  status: "accepted", actor: "Maria", chore: "Cleaned toilet", points: 5,
  leaderboards: { this_week: week, this_month: month },
  medals: { gained: [{ member: "Maria", label: "Toilet champion" }], lost: [] },
};
const decision = (p: Decision) => renderHousemateEmail({ household: "Unit 4B", payload: p, appUrl: APP });

test("an accepted claim says who, what and how many points", () => {
  const e = decision(accepted);
  assert.equal(e.subject, "Maria Cleaned toilet +5");
  assert.match(e.html, /Maria Cleaned toilet/);
  assert.match(e.html, /\+5/);
  assert.match(e.text, /Maria Cleaned toilet \(\+5\)/);
});

test("both leaderboards are in the email, ranked, with this week and this month", () => {
  const e = decision(accepted);
  assert.match(e.html, /This week/);
  assert.match(e.html, /This month/);
  assert.match(e.text, /1\. Maria\s+8/);
  assert.match(e.text, /2\. Ben\s+4/);
  assert.ok(e.html.indexOf("This week") < e.html.indexOf("This month"));
});

test("it says who was overtaken, or that no one was, for each leaderboard", () => {
  const e = decision(accepted);
  assert.match(e.html, /Ben was overtaken by Maria/);
  assert.match(e.html, /No one was overtaken/); // the month board
  const many = decision({ ...accepted, leaderboards: { this_week: { ...week, overtaken: [{ name: "Ben", by: "Maria" }, { name: "Cy", by: "Maria" }] }, this_month: month } });
  assert.match(many.html, /Ben and Cy were overtaken by Maria/);
  assert.match(many.text, /Ben and Cy were overtaken by Maria/);
});

test("it says which trophy was gained or lost, or that none changed", () => {
  assert.match(decision(accepted).html, /Maria earned Toilet champion/);
  const lost = decision({ ...accepted, medals: { gained: [], lost: [{ member: "Ana", label: "Toilet champion" }] } });
  assert.match(lost.html, /Ana lost Toilet champion/);
  assert.match(lost.text, /Ana lost Toilet champion/);
  const none = decision({ ...accepted, medals: { gained: [], lost: [] } });
  assert.match(none.html, /No trophy changes/);
});

test("the person who did the chore is highlighted in the leaderboard", () => {
  assert.match(decision(accepted).html, /data-you="true"/);
});

test("a rejection is short: no leaderboards, no trophies", () => {
  const e = decision({ status: "rejected", actor: "Maria", chore: "Cleaned toilet" });
  assert.equal(e.subject, "Maria's claim was rejected");
  assert.match(e.html, /Cleaned toilet/);
  assert.doesNotMatch(e.html, /This week|This month|trophy/i);
  assert.doesNotMatch(e.text, /This week|This month|trophy/i);
});

test("names and notes cannot inject markup", () => {
  const evil = '<script>alert(1)</script> & "q"';
  const e = decision({ ...accepted, actor: evil, leaderboards: { this_week: week, this_month: month } });
  assert.doesNotMatch(e.html, /<script>/);
  assert.match(e.html, /&lt;script&gt;/);
  assert.match(e.html, /&amp;/);
  const a = renderAdminEmail({ household: "Unit 4B", appUrl: APP, acceptUrl: `${APP}/decide/t?do=accept`, rejectUrl: `${APP}/decide/t?do=reject`,
    payload: { housemate: "Maria", chore: "Cleaned toilet", points: 5, note: evil, custom: false } });
  assert.doesNotMatch(a.html, /<script>/);
  assert.match(a.html, /&lt;script&gt;/);
});

const claim: AdminClaim = { housemate: "Maria", chore: "Cleaned toilet", points: 5, note: "Scrubbed the whole bathroom", custom: false };
const admin = (p: AdminClaim) => renderAdminEmail({ household: "Unit 4B", payload: p, appUrl: APP,
  acceptUrl: `${APP}/decide/tok?do=accept`, rejectUrl: `${APP}/decide/tok?do=reject` });

test("the admin email names the claim and has Accept and Reject links", () => {
  const e = admin(claim);
  assert.equal(e.subject, "Maria Cleaned toilet: approve?");
  assert.match(e.html, /href="https:\/\/kasangga\.vercel\.app\/decide\/tok\?do=accept"/);
  assert.match(e.html, /href="https:\/\/kasangga\.vercel\.app\/decide\/tok\?do=reject"/);
  assert.match(e.html, /\+5/);
  assert.match(e.html, /Scrubbed the whole bathroom/);
  assert.match(e.text, /Accept: https:\/\/kasangga\.vercel\.app\/decide\/tok\?do=accept/);
  assert.match(e.text, /Reject: https:\/\/kasangga\.vercel\.app\/decide\/tok\?do=reject/);
});

test("a typed deed has no Accept link, only Reject and the app", () => {
  const e = admin({ housemate: "Maria", chore: "Fixed the shelf", points: null, note: null, custom: true });
  assert.equal(e.subject, "Maria fixed the shelf: approve?");
  assert.doesNotMatch(e.html, /do=accept/);
  assert.match(e.html, /do=reject/);
  assert.match(e.html, /Typed deed/);
  assert.match(e.html, /href="https:\/\/kasangga\.vercel\.app"/);
  assert.doesNotMatch(e.text, /Accept:/);
});

test("the emails load nothing remote, and follow dark mode", () => {
  for (const e of [decision(accepted), admin(claim)]) {
    assert.doesNotMatch(e.html, /<img|url\(|src=/i);
    assert.match(e.html, /prefers-color-scheme: dark/);
    assert.match(e.html, /<meta name="viewport"/);
  }
});

test("the housemate email links to the leaderboard", () => {
  assert.match(decision(accepted).html, /href="https:\/\/kasangga\.vercel\.app\/leaderboard"/);
});

// Several claims decided before a send: one email per housemate.
const digest = (ps: Decision[]) => renderDigestEmail({ household: "Unit 4B", payloads: ps, appUrl: APP });
const board = (rows: [string, number][], overtaken: { name: string; by: string }[] = []) => ({
  before: [], overtaken, after: rows.map(([name, points], i) => ({ name, points, rank: i + 1 })),
});
const acc = (actor: string, chore: string, points: number, wk: ReturnType<typeof board>, medals = { gained: [] as { member: string; label: string }[], lost: [] as { member: string; label: string }[] }): Decision =>
  ({ status: "accepted", actor, chore, points, leaderboards: { this_week: wk, this_month: board([["Maria", 20], ["Ben", 10]]) }, medals });

test("one decision in a batch is the same email as a single decision", () => {
  assert.deepEqual(digest([accepted]), decision(accepted));
});

test("a batch lists every claim in one email", () => {
  const e = digest([
    acc("Maria", "Cleaned toilet", 5, board([["Maria", 5], ["Ben", 4]])),
    acc("Ben", "Cooked dinner", 4, board([["Maria", 5], ["Ben", 8]])),
    { status: "rejected", actor: "Cy", chore: "Dishes" },
  ]);
  assert.equal(e.subject, "3 claims decided in Unit 4B");
  assert.match(e.html, /Maria Cleaned toilet/);
  assert.match(e.html, /\+5/);
  assert.match(e.html, /Ben Cooked dinner/);
  assert.match(e.html, /Cy&#39;s claim for Dishes was rejected|Cy's claim for Dishes was rejected/);
  assert.match(e.text, /Maria Cleaned toilet \(\+5\)/);
  assert.match(e.text, /Cy's claim for Dishes was rejected/);
});

test("the leaderboards in a batch are the latest standings", () => {
  const e = digest([
    acc("Maria", "Cleaned toilet", 5, board([["Maria", 5], ["Ben", 4]])),
    acc("Ben", "Cooked dinner", 4, board([["Ben", 8], ["Maria", 5]])),
  ]);
  assert.match(e.text, /1\. Ben\s+8/);
  assert.doesNotMatch(e.text, /1\. Maria\s+5/);
});

test("a batch lists everyone overtaken once, and drops a pass that was passed back", () => {
  const e = digest([
    acc("Maria", "Cleaned toilet", 5, board([["Maria", 5]], [{ name: "Ben", by: "Maria" }, { name: "Cy", by: "Maria" }])),
    acc("Maria", "Dishes", 1, board([["Maria", 6]], [{ name: "Ben", by: "Maria" }])),
    acc("Ben", "Cooked dinner", 4, board([["Ben", 8]], [{ name: "Maria", by: "Ben" }])),
  ]);
  assert.doesNotMatch(e.text, /Ben was overtaken by Maria/); // Ben passed Maria back
  assert.doesNotMatch(e.text, /Maria was overtaken by Ben/);
  assert.match(e.text, /Cy was overtaken by Maria/);
});

test("trophies in a batch are net: a gain and a loss of the same trophy cancel", () => {
  const gain = { gained: [{ member: "Maria", label: "Toilet champion" }], lost: [] };
  const loss = { gained: [], lost: [{ member: "Maria", label: "Toilet champion" }] };
  const kept = digest([acc("Maria", "Cleaned toilet", 5, board([["Maria", 5]]), gain), acc("Ben", "Dishes", 1, board([["Maria", 5]]))]);
  assert.match(kept.text, /Maria earned Toilet champion/);
  const cancelled = digest([acc("Maria", "Cleaned toilet", 5, board([["Maria", 5]]), gain), acc("Ben", "Cleaned toilet", 5, board([["Maria", 5]]), loss)]);
  assert.match(cancelled.text, /No trophy changes/);
  assert.doesNotMatch(cancelled.text, /Toilet champion/);
});

test("a batch of only rejections has no leaderboards", () => {
  const e = digest([{ status: "rejected", actor: "Cy", chore: "Dishes" }, { status: "rejected", actor: "Ben", chore: "Cooked dinner" }]);
  assert.equal(e.subject, "2 claims decided in Unit 4B");
  assert.doesNotMatch(e.html, /This week|This month/);
  assert.match(e.html, /Cooked dinner/);
});

test("names in a batch cannot inject markup", () => {
  const e = digest([acc("<b>x</b>", "Dishes", 1, board([["Maria", 5]])), acc("Ben", "Dishes", 1, board([["Maria", 5]]))]);
  assert.doesNotMatch(e.html, /<b>x<\/b>/);
  assert.match(e.html, /&lt;b&gt;x&lt;\/b&gt;/);
});

// Contributors: the claimer's name stays in the subject; the body says who else did it.
test("a housemate email names the contributors", () => {
  const e = decision({ ...accepted, contributors: ["Ben", "Cy"] } as Decision);
  assert.match(e.html, /with Ben and Cy/);
  assert.match(e.text, /with Ben and Cy/);
  assert.equal(e.subject, "Maria Cleaned toilet +5");
  assert.doesNotMatch(decision(accepted).html, /with Ben/);
});

test("the admin email names the contributors, escaped", () => {
  const e = admin({ ...claim, contributors: ["Ben", "<b>Cy</b>"] });
  assert.match(e.html, /with Ben and &lt;b&gt;Cy&lt;\/b&gt;/);
  assert.match(e.text, /with Ben and <b>Cy<\/b>/);
  assert.doesNotMatch(admin(claim).text, /with /);
});

// One email goes to every housemate who is waiting on the same claims: the first in "to", the rest in "cc".
const hrow = (id: string, claim: string, who: string, email: string | null = `${who}@x.test`) =>
  ({ id, kind: "housemate_decision", claim_id: claim, recipient_id: who, email });

test("housemates waiting on the same claim share one email: first in to, the rest in cc", () => {
  const out = groupForMail([hrow("1", "c1", "ana"), hrow("2", "c1", "ben"), hrow("3", "c1", "cy")]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].emails, ["ana@x.test", "ben@x.test", "cy@x.test"]);
  assert.deepEqual(out[0].rows.map((r) => r.id), ["1", "2", "3"]);
});

test("a housemate with several claims waiting gets them together, shared with whoever waits on the same set", () => {
  const out = groupForMail([hrow("1", "c1", "ana"), hrow("2", "c2", "ana"), hrow("3", "c2", "ben"), hrow("4", "c1", "ben")]);
  assert.equal(out.length, 1);
  assert.equal(out[0].lead.length, 2);
  assert.equal(out[0].rows.length, 4);
});

test("a housemate waiting on a different set gets their own email", () => {
  const out = groupForMail([hrow("1", "c1", "ana"), hrow("2", "c1", "ben"), hrow("3", "c2", "cy")]);
  assert.deepEqual(out.map((g) => g.emails), [["ana@x.test", "ben@x.test"], ["cy@x.test"]]);
});

test("a housemate without an address is left out of the list, but their row is still finished", () => {
  const out = groupForMail([hrow("1", "c1", "ana"), hrow("2", "c1", "ben", null)]);
  assert.deepEqual(out[0].emails, ["ana@x.test"]);
  assert.equal(out[0].rows.length, 2);
});

test("admins waiting on the same claim share one email: first in to, the rest in cc", () => {
  const a = { ...hrow("1", "c1", "ana"), kind: "admin_claim" };
  const b = { ...hrow("2", "c1", "ben"), kind: "admin_claim" };
  const out = groupForMail([a, b]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].emails, ["ana@x.test", "ben@x.test"]);
  assert.deepEqual(out[0].rows.map((r) => r.id), ["1", "2"]);
});

test("admin emails for different claims stay separate", () => {
  const a = { ...hrow("1", "c1", "ana"), kind: "admin_claim" };
  const b = { ...hrow("2", "c2", "ana"), kind: "admin_claim" };
  assert.equal(groupForMail([a, b]).length, 2);
});

test("an admin and a housemate waiting on the same claim never share an email", () => {
  const a = { ...hrow("1", "c1", "ana"), kind: "admin_claim" };
  assert.equal(groupForMail([a, hrow("2", "c1", "ana")]).length, 2);
});
