// Turns a notification row into an email: subject, HTML and plain text. Pure, so it is tested without a network.
// The look follows the web app: paper background, ink text, one lime accent, rounded cards; dark mode follows the reader's.

export type Row = { name: string; points: number; rank: number };
export type Board = { before: Row[]; after: Row[]; overtaken: { name: string; by: string }[] };
type Medal = { member: string; label: string };
export type Decision =
  | { status: "rejected"; actor: string; chore: string }
  | {
      status: "accepted"; actor: string; chore: string; points: number;
      leaderboards: { this_week: Board; this_month: Board };
      medals: { gained: Medal[]; lost: Medal[] };
    };
export type AdminClaim = { housemate: string; chore: string; points: number | null; note: string | null; custom: boolean };
export type Email = { subject: string; html: string; text: string };

const C = { bg: "#f2efe6", surface: "#fbfaf5", surface2: "#e8e4d8", ink: "#16171b", muted: "#5c5a52", line: "#d8d3c4", accent: "#cbff41", bad: "#be2a1f" };
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
// A typed deed is lowercase after the name ("Maria fixed the shelf"); a catalog deed keeps its capital.
const deedWords = (chore: string, custom: boolean) => (custom ? chore.charAt(0).toLowerCase() + chore.slice(1) : chore);
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// Names grouped by who passed them: "Ben and Cy were overtaken by Maria".
function overtakenLines(b: Board): string[] {
  if (!b.overtaken.length) return ["No one was overtaken."];
  const by = new Map<string, string[]>();
  for (const o of b.overtaken) by.set(o.by, [...(by.get(o.by) ?? []), o.name]);
  return [...by].map(([who, names]) => `${list(names)} ${names.length === 1 ? "was" : "were"} overtaken by ${who}.`);
}
const trophyLines = (m: { gained: Medal[]; lost: Medal[] }): string[] => {
  const lines = [...m.gained.map((g) => `${g.member} earned ${g.label}`), ...m.lost.map((l) => `${l.member} lost ${l.label}`)];
  return lines.length ? lines : ["No trophy changes."];
};

const dark = `@media (prefers-color-scheme: dark){
  .bg{background:#101113 !important}.card{background:#18191c !important;border-color:#2d2e33 !important}
  .ink{color:#f3f1ea !important}.muted{color:#a3a198 !important}.line{border-color:#2d2e33 !important}
  .soft{background:#232428 !important}.you{background:#d4fb4c !important;color:#16171b !important}
  .btn{background:#f3f1ea !important;color:#101113 !important}.ghost{color:#f3f1ea !important;border-color:#2d2e33 !important}
  .chip{background:#d4fb4c !important;color:#16171b !important}}`;

function shell(subject: string, preheader: string, household: string, inner: string, footer: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(subject)}</title><style>${dark}</style></head>
<body class="bg" style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
<tr><td class="ink" style="padding:0 4px 14px;font-size:15px;font-weight:800;color:${C.ink}">Kasangga <span class="muted" style="font-weight:600;color:${C.muted}">· ${esc(household)}</span></td></tr>
<tr><td class="card" style="background:${C.surface};border:1px solid ${C.line};border-radius:24px;padding:24px">${inner}</td></tr>
<tr><td class="muted" style="padding:16px 8px 0;font-size:12px;line-height:1.5;color:${C.muted}">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const chip = (t: string) => `<span class="chip" style="display:inline-block;background:${C.accent};color:${C.ink};border-radius:999px;padding:3px 11px;font-size:14px;font-weight:700">${esc(t)}</span>`;
const h1 = (t: string) => `<h1 class="ink" style="margin:0 0 10px;font-size:26px;line-height:1.2;font-weight:800;color:${C.ink}">${esc(t)}</h1>`;
const para = (t: string, muted = false) => `<p class="${muted ? "muted" : "ink"}" style="margin:0 0 6px;font-size:14px;line-height:1.5;color:${muted ? C.muted : C.ink}">${esc(t)}</p>`;
const button = (href: string, label: string, primary: boolean) => primary
  ? `<a class="btn" href="${esc(href)}" style="display:inline-block;background:${C.ink};color:${C.bg};text-decoration:none;border-radius:999px;padding:13px 24px;font-size:15px;font-weight:700">${esc(label)}</a>`
  : `<a class="ghost" href="${esc(href)}" style="display:inline-block;color:${C.ink};text-decoration:none;border:1px solid ${C.line};border-radius:999px;padding:12px 23px;font-size:15px;font-weight:600">${esc(label)}</a>`;

function boardHtml(title: string, b: Board, actor: string): string {
  const rows = b.after.map((r) => {
    const you = r.name === actor;
    return `<tr${you ? ' data-you="true" class="you"' : ""} style="${you ? `background:${C.accent};color:${C.ink};` : ""}"><td style="padding:8px 10px;width:28px;font-size:14px;font-weight:700;border-radius:12px 0 0 12px">${r.rank}</td><td style="padding:8px 4px;font-size:14px;font-weight:${you ? 700 : 500}">${esc(r.name)}</td><td align="right" style="padding:8px 10px;font-size:14px;font-weight:700;border-radius:0 12px 12px 0">${r.points}</td></tr>`;
  }).join("");
  const notes = overtakenLines(b).map((l) => para(l, true)).join("");
  return `<p class="muted" style="margin:22px 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted}">${esc(title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ink" style="color:${C.ink}">${rows}</table><div style="padding-top:8px">${notes}</div>`;
}

export function renderHousemateEmail({ household, payload, appUrl }: { household: string; payload: Decision; appUrl: string }): Email {
  const app = appUrl.replace(/\/$/, "");
  if (payload.status === "rejected") {
    const subject = oneLine(`${payload.actor}'s claim was rejected`);
    const line = `${payload.actor}'s claim for ${payload.chore} was rejected, so no points were added.`;
    return {
      subject,
      html: shell(subject, line, household, `${h1("Claim rejected")}${para(line)}<div style="padding-top:18px">${button(`${app}/leaderboard`, "View leaderboard", false)}</div>`,
        `You get this because you live in ${esc(household)}.`),
      text: `${line}\n\n${app}/leaderboard\n`,
    };
  }
  const head = `${payload.actor} ${payload.chore}`;
  const subject = oneLine(`${head} +${payload.points}`);
  const { this_week: week, this_month: month } = payload.leaderboards;
  const trophies = trophyLines(payload.medals).map((l) => para(/^(.+) (earned) /.test(l) ? `🏆 ${l}` : l)).join("");
  const inner = `${h1(head)}<p style="margin:0 0 4px">${chip(`+${payload.points}`)}</p>
${boardHtml("This week", week, payload.actor)}${boardHtml("This month", month, payload.actor)}
<p class="muted" style="margin:22px 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted}">Trophies</p>${trophies}
<div style="padding-top:18px">${button(`${app}/leaderboard`, "View leaderboard", true)}</div>`;
  const rows = (b: Board) => b.after.map((r) => `${r.rank}. ${r.name.padEnd(16)} ${r.points}`).join("\n");
  const text = [
    `${head} (+${payload.points})`, household, "",
    "THIS WEEK", rows(week), ...overtakenLines(week), "",
    "THIS MONTH", rows(month), ...overtakenLines(month), "",
    "TROPHIES", ...trophyLines(payload.medals), "", `${app}/leaderboard`, "",
  ].join("\n");
  return { subject, html: shell(subject, `${head} · +${payload.points}`, household, inner, `You get this because you live in ${esc(household)}.`), text };
}

export function renderAdminEmail({ household, payload, appUrl, acceptUrl, rejectUrl }:
  { household: string; payload: AdminClaim; appUrl: string; acceptUrl: string; rejectUrl: string }): Email {
  const app = appUrl.replace(/\/$/, "");
  const head = `${payload.housemate} ${deedWords(payload.chore, payload.custom)}`;
  const subject = oneLine(`${head}: approve?`);
  const note = payload.note ? `<p class="soft muted" style="margin:14px 0 0;background:${C.surface2};color:${C.muted};border-radius:14px;padding:10px 14px;font-size:14px;line-height:1.5">&ldquo;${esc(payload.note)}&rdquo;</p>` : "";
  const first = payload.custom ? button(app, "Open the app", false) : button(acceptUrl, "Accept", true);
  const reject = `<a class="ghost" href="${esc(rejectUrl)}" style="display:inline-block;color:${C.bad};text-decoration:none;border:1px solid ${C.line};border-radius:999px;padding:12px 23px;font-size:15px;font-weight:600">Reject</a>`;
  const inner = `<p class="muted" style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted}">Waiting for you</p>
${h1(head)}<p style="margin:0">${payload.custom ? chip("Typed deed") : chip(`+${payload.points}`)}</p>${note}
${payload.custom ? `<div style="padding-top:14px">${para("You set the points for a typed deed, so accept it in the app. You can reject it here.", true)}</div>` : ""}
<div style="padding-top:20px">${first}&nbsp;&nbsp;${reject}</div>`;
  const text = [
    `${head} (${payload.custom ? "Typed deed" : `+${payload.points}`}) is waiting for you.`, household,
    ...(payload.note ? ["", `"${payload.note}"`] : []), "",
    ...(payload.custom ? [`Open the app: ${app}`] : [`Accept: ${acceptUrl}`]), `Reject: ${rejectUrl}`, "",
    "Each link works once and expires in 7 days.", "",
  ].join("\n");
  return { subject, html: shell(subject, `${head} · waiting for your decision`, household, inner, "Each button opens a page where you confirm. The link works once and expires in 7 days."), text };
}
