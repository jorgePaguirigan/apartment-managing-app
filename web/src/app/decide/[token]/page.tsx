import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { decideByLink } from "../../actions";
import { CenterCard } from "../../_components/center-card";
import { SubmitButton } from "../../_components/submit-button";
import { Banner, Chip, Icon, button, danger, ghost } from "../../_components/ui";

// Keep the token out of search results and out of the Referer header.
export const metadata = { title: "Decide a claim", robots: { index: false }, referrer: "no-referrer" as const };

export default async function Decide({ params, searchParams }: PageProps<"/decide/[token]">) {
  const { token } = await params;
  const { error, do: pick } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("claim_for_token", { p_token: token });
  const claim = data?.[0];

  if (!claim) {
    return (
      <CenterCard>
        <div className="space-y-5">
          <h1 className="display text-3xl font-bold">Link not valid</h1>
          <p className="text-muted">This link is invalid or has expired. You can still decide claims in the app.</p>
          <Link href="/" className={`${button} w-full`}>Open the app</Link>
        </div>
      </CenterCard>
    );
  }

  if (claim.status !== "pending") {
    return (
      <CenterCard>
        <div className="space-y-5">
          <h1 className="display flex items-center gap-2 text-3xl font-bold">
            <Icon name={claim.status === "accepted" ? "check" : "x"} className="size-7" />
            {claim.status === "accepted" ? "Accepted" : "Rejected"}
          </h1>
          <p className="text-muted">
            {claim.housemate}&rsquo;s claim for <strong className="text-ink">{claim.chore}</strong> is {claim.status}.
            {claim.status === "accepted" && claim.points ? ` ${claim.points} points are on the leaderboard.` : ""}
          </p>
          <Link href="/" className={`${ghost} w-full`}>Open the app</Link>
        </div>
      </CenterCard>
    );
  }

  const rejectFirst = pick === "reject";
  return (
    <CenterCard>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="eyebrow">{claim.household} · waiting for you</p>
          <h1 className="display text-balance text-3xl font-bold">
            {claim.housemate} {claim.custom ? claim.chore.charAt(0).toLowerCase() + claim.chore.slice(1) : claim.chore}
          </h1>
          <p className="flex flex-wrap items-center gap-2">
            {claim.custom ? <Chip tone="muted">Typed deed</Chip> : <Chip tone="points">+{claim.points}</Chip>}
          </p>
          {claim.note && <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">&ldquo;{claim.note}&rdquo;</p>}
        </div>
        <Banner error={error as string | undefined} />
        {claim.custom && <p className="text-sm text-muted">You set the points for a typed deed, so accept it in the app. You can reject it here.</p>}
        <form action={decideByLink} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="token" value={token} />
          {claim.custom ? (
            <Link href="/" className={ghost}>Open the app</Link>
          ) : (
            <SubmitButton name="accept" value="1" pendingText="Accepting…" className={rejectFirst ? ghost : button}>
              <Icon name="check" />Accept
            </SubmitButton>
          )}
          <SubmitButton name="accept" value="0" pendingText="Rejecting…" className={rejectFirst ? danger : ghost}>
            <Icon name="x" />Reject
          </SubmitButton>
        </form>
      </div>
    </CenterCard>
  );
}
