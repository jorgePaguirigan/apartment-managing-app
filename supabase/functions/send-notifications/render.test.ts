// Tests for the email renderer. Run with `node --test supabase/functions/send-notifications/render.test.ts`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderAdminEmail, renderHousemateEmail, type AdminClaim, type Decision } from "./render.ts";

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
