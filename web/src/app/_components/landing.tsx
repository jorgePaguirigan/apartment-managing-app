import Link from "next/link";
import { signIn, signUp } from "../actions";
import { Banner, Icon, button, input, type IconName } from "./ui";
import { SubmitButton } from "./submit-button";

const FEATURES: { icon: IconName; title: string; text: string; live: boolean }[] = [
  { icon: "check", title: "Points that mean something", text: "Tap what you did. Your admin approves it and the board updates.", live: true },
  { icon: "medal", title: "Medals for streaks", text: "Champions, monthly MVPs and 4-week streaks are awarded for you.", live: true },
  { icon: "wash", title: "Chore schedule", text: "Washing-machine days and cleaning duties, fairly shared.", live: false },
  { icon: "wallet", title: "House budget", text: "Allowance cards for rent, wifi and groceries.", live: false },
];

export function Logo() {
  return (
    <p className="display flex items-center gap-2.5 text-lg font-bold">
      <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-accent text-[#16171b]">
        <Icon name="home" className="size-5" />
      </span>
      Apartment Manager
    </p>
  );
}

// Static picture of the board, so the page shows what the app is for. Not real data.
function BoardPreview() {
  const rows = [["Sam", 42], ["Alex", 31], ["Jo", 18]] as const;
  return (
    <div aria-hidden className="rise max-w-md space-y-2 rounded-3xl border border-line bg-surface p-3 [animation-delay:120ms]">
      <p className="eyebrow px-2 pt-1">This week</p>
      {rows.map(([name, pts], i) => (
        <div key={name} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${i === 0 ? "bg-accent text-[#16171b]" : ""}`}>
          <span className="display w-5 text-lg font-bold">{i + 1}</span>
          <span className="flex-1 font-medium">{name}</span>
          <span className="display text-xl font-bold tabular-nums">{pts}</span>
        </div>
      ))}
    </div>
  );
}

// Public landing page with the sign-in card on the right (below the hero on small screens).
export function Landing({ error, sent, next, mode }: { error?: string; sent?: boolean; next?: string; mode?: string }) {
  const invited = next?.startsWith("/join/");
  const creating = mode ? mode === "signup" : !!invited; // invitees are usually new
  const other = `/login?mode=${creating ? "signin" : "signup"}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return (
    <main className="relative isolate min-h-svh">
      <div aria-hidden className="grid-paper absolute inset-0 -z-10" />
      <div className="pad-safe mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-10 sm:px-8">
        <header><Logo /></header>

        <div className="landing-grid flex-1 items-center">
          <section style={{ gridArea: "hero" }} className="rise space-y-5">
            <p className="eyebrow">Household scoreboard</p>
            <h1 className="display text-balance text-5xl font-extrabold leading-[1.08] sm:text-6xl lg:text-7xl">
              Keep the house running, <span className="rounded-2xl bg-accent px-2 text-[#16171b]">together.</span>
            </h1>
            <p className="max-w-xl text-pretty text-lg text-muted">
              Housemates earn points for chores and good habits. An admin approves, the board keeps it friendly, and medals reward the streaks.
            </p>
          </section>

          <section style={{ gridArea: "card" }} className="rise w-full max-w-lg [animation-delay:60ms] min-[900px]:max-w-md min-[900px]:justify-self-end">
            <div className="rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
              {sent ? (
                <div className="rise space-y-3" role="status">
                  <h2 className="display text-3xl font-bold">Check your email</h2>
                  <p className="text-muted">We sent you a link to confirm your account. Open it on this device to continue.</p>
                  <p className="text-sm text-muted">Nothing after a minute? Check spam, then <Link href="/" className="font-semibold text-ink underline underline-offset-4">try again</Link>.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h2 className="display text-3xl font-bold">{creating ? (invited ? "You're invited" : "Create account") : "Sign in"}</h2>
                    <p className="text-muted">
                      {creating ? "Pick a password and you're in. You'll stay signed in on this device." : "Welcome back."}
                    </p>
                  </div>
                  <Banner error={error} />
                  <form action={creating ? signUp : signIn} className="space-y-3">
                    <input type="hidden" name="next" value={next ?? "/"} />
                    <label className="block space-y-1.5 text-sm font-semibold">
                      Email
                      <input name="email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" className={`${input} font-normal`} />
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold">
                      Password
                      <input name="password" type="password" required minLength={creating ? 8 : undefined} autoComplete={creating ? "new-password" : "current-password"} className={`${input} font-normal`} />
                      {creating && <span className="block text-xs font-normal text-muted">At least 8 characters.</span>}
                    </label>
                    <SubmitButton className={`${button} w-full`} pendingText={creating ? "Creating…" : "Signing in…"}>{creating ? "Create account" : "Sign in"}</SubmitButton>
                  </form>
                  <p className="text-sm text-muted">
                    {creating ? "Already have an account? " : "New here? "}
                    <Link href={other} className="font-semibold text-ink underline underline-offset-4">{creating ? "Sign in" : "Create an account"}</Link>
                  </p>
                </div>
              )}
            </div>
          </section>

          <div style={{ gridArea: "preview" }} className="space-y-6">
            <BoardPreview />
            <ul aria-label="Features" className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <li key={f.title} style={{ animationDelay: `${160 + i * 40}ms` }} className="rise flex gap-3">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name={f.icon} /></span>
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      {f.title}
                      {!f.live && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] font-semibold text-muted">Soon</span>}
                    </h3>
                    <p className="text-sm text-muted">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
