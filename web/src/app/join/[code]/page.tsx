import { joinHousehold } from "../../actions";
import { CenterCard } from "../../_components/center-card";
import { SubmitButton } from "../../_components/submit-button";
import { Banner, button, input } from "../../_components/ui";

export default async function Join({ params, searchParams }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const { error } = await searchParams;
  return (
    <CenterCard>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="display text-3xl font-bold">Join your household</h1>
          <p className="text-muted">Pick the name your housemates will see.</p>
        </div>
        <Banner error={error as string | undefined} />
        <form action={joinHousehold} className="space-y-4">
          <input type="hidden" name="code" value={code} />
          <label className="block space-y-1.5 text-sm font-semibold">
            Your name
            <input name="display_name" required autoComplete="name" className={`${input} font-normal`} />
          </label>
          <SubmitButton className={`${button} w-full`} pendingText="Joining…">Join</SubmitButton>
        </form>
      </div>
    </CenterCard>
  );
}
