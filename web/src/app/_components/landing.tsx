import Link from "next/link";
import { signIn } from "../actions";
import { Banner, button, input } from "./ui";
import { SubmitButton } from "./submit-button";

const FEATURES = [
  { icon: "🏆", title: "Points that mean something", text: "Tap what you did. Your admin approves it and the leaderboard updates.", live: true },
  { icon: "🏅", title: "Medals for streaks", text: "Champions, monthly MVPs and 4-week streaks are awarded for you.", live: true },
  { icon: "🧺", title: "Chore schedule", text: "Washing-machine days and cleaning duties, fairly shared.", live: false },
  { icon: "💸", title: "House budget", text: "Allowance cards for rent, wifi and groceries.", live: false },
];

export function Logo() {
  return (
    <p className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
      <svg aria-hidden viewBox="0 0 24 24" className="size-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9.5h13V10" />
        <path d="M10 19.5v-5h4v5" />
      </svg>
      Apartment Manager
    </p>
  );
}

// Public landing page with the sign-in card on the right (below the hero on small screens).
export function Landing({ error, sent, next }: { error?: string; sent?: boolean; next?: string }) {
  const invited = next?.startsWith("/join/");
  return (
    <main className="glow relative isolate min-h-svh">
      <div className="pad-safe mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 sm:px-8">
        <header><Logo /></header>

        <div className="landing-grid flex-1 items-center">
          <section style={{ gridArea: "hero" }} className="rise space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Keep the house running, together.
            </h1>
            <p className="max-w-xl text-pretty text-lg text-muted">
              Housemates earn points for chores and good habits. An admin approves, a leaderboard keeps it friendly, and medals reward the streaks.
            </p>
          </section>

          <section style={{ gridArea: "card" }} className="rise w-full max-w-lg [animation-delay:60ms] min-[860px]:max-w-md min-[860px]:justify-self-end">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-xl shadow-black/5 sm:p-8">
              {sent ? (
                <div className="rise space-y-3" role="status">
                  <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
                  <p className="text-muted">We sent you a sign-in link. Open it on this device to continue.</p>
                  <p className="text-sm text-muted">Nothing after a minute? Check spam, then <Link href="/" className="font-medium text-ink underline underline-offset-4">try again</Link>.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-semibold tracking-tight">{invited ? "You're invited" : "Sign in"}</h2>
                    <p className="text-muted">
                      {invited ? "Sign in to join your household." : "Enter your email and we'll send you a link. No password to remember."}
                    </p>
                  </div>
                  <Banner error={error} />
                  <form action={signIn} className="space-y-3">
                    <input type="hidden" name="next" value={next ?? "/"} />
                    <label className="block space-y-1.5 text-sm font-medium">
                      Email
                      <input name="email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" className={`${input} font-normal`} />
                    </label>
                    <SubmitButton className={`${button} w-full`} pendingText="Sending…">Email me a link</SubmitButton>
                  </form>
                  <p className="text-sm text-muted">New here? Signing in creates your account. To join a household, open the invite link you were sent.</p>
                </div>
              )}
            </div>
          </section>

          <section style={{ gridArea: "features" }} aria-label="Features" className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <article key={f.title} style={{ animationDelay: `${120 + i * 40}ms` }} className="rise rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-surface-2 text-lg">{f.icon}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.live ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted"}`}>{f.live ? "Live" : "Coming soon"}</span>
                </div>
                <h3 className="font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted">{f.text}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
