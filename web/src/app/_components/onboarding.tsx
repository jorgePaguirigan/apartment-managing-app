import { createHousehold, openInvite, signOut } from "../actions";
import { CenterCard } from "./center-card";
import { SubmitButton } from "./submit-button";
import { Banner, button, ghost, input } from "./ui";

export function Onboarding({ error }: { error?: string }) {
  return (
    <CenterCard>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="display text-3xl font-bold">Set up your household</h1>
          <p className="text-muted">You become its admin.</p>
        </div>
        <Banner error={error} />
        <form action={openInvite} className="space-y-2 rounded-2xl border border-line bg-bg p-4">
          <label className="block space-y-1.5 text-sm font-semibold">
            Were you invited? Paste your invite code
            <input name="invite" required placeholder="Invite code" autoCapitalize="none" spellCheck={false} className={`${input} font-normal`} />
          </label>
          <SubmitButton className={`${ghost} w-full`} pendingText="Opening…">Join with invite</SubmitButton>
        </form>
        <p className="eyebrow text-center">Or start your own</p>
        <form action={createHousehold} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-semibold">
            Household name
            <input name="name" required placeholder="Unit 4B" className={`${input} font-normal`} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            Your name
            <input name="display_name" required autoComplete="name" className={`${input} font-normal`} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            Time zone
            <select name="timezone" defaultValue="Asia/Manila" className={`${input} font-normal`}>
              {Intl.supportedValuesOf("timeZone").map((z) => <option key={z}>{z}</option>)}
            </select>
            <span className="block text-xs font-normal text-muted">Weeks and months on the leaderboard start and end in this time zone.</span>
          </label>
          <SubmitButton className={`${button} w-full`} pendingText="Creating…">Create household</SubmitButton>
        </form>
        <form action={signOut}><button className={`${ghost} w-full`}>Sign out</button></form>
      </div>
    </CenterCard>
  );
}
