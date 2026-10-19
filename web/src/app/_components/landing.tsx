import { signInWithGoogle } from "../actions";
import { Banner, Icon, ghost, type IconName } from "./ui";
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

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

// Public landing page with the sign-in card on the right (below the hero on small screens).
export function Landing({ error, next }: { error?: string; next?: string }) {
  const invited = next?.startsWith("/join/");
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
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h2 className="display text-3xl font-bold">{invited ? "You're invited" : "Sign in"}</h2>
                  <p className="text-muted">{invited ? "Continue with Google to join your household." : "Welcome back."}</p>
                </div>
                <Banner error={error} />
                <form action={signInWithGoogle}>
                  <input type="hidden" name="next" value={next ?? "/"} />
                  <SubmitButton className={`${ghost} min-h-12 w-full bg-white text-[#1f1f1f]`} pendingText="Redirecting…">
                    <GoogleMark /> Continue with Google
                  </SubmitButton>
                </form>
              </div>
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
