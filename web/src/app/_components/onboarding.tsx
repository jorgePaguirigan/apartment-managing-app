import { createHousehold, signOut } from "../actions";
import { CenterCard } from "./center-card";
import { SubmitButton } from "./submit-button";
import { Banner, button, ghost, input } from "./ui";

export function Onboarding({ error }: { error?: string }) {
  return (
    <CenterCard>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your household</h1>
          <p className="text-muted">You become its admin. To join an existing household, open the invite link you were sent instead.</p>
        </div>
        <Banner error={error} />
        <form action={createHousehold} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            Household name
            <input name="name" required placeholder="Unit 4B" className={`${input} font-normal`} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Your name
            <input name="display_name" required autoComplete="name" className={`${input} font-normal`} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
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
