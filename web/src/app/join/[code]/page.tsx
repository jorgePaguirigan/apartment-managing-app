import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { errorCode } from "@/lib/errors";
import { joinHousehold } from "../../actions";
import { CenterCard } from "../../_components/center-card";
import { SubmitButton } from "../../_components/submit-button";
import { Banner, button, input } from "../../_components/ui";

export default async function Join({ params, searchParams }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const { error: shown } = await searchParams;
  let error = shown as string | undefined;
  if (!error) {
    // Invited people only sign in: join straight away with their Google name. The form below is the fallback if it fails.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const full = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");
    const { error: e } = await supabase.rpc("join_household", {
      p_code: code,
      p_display_name: full.split(" ")[0] || user?.email?.split("@")[0] || "Housemate",
    });
    if (!e) redirect("/");
    error = errorCode(e.message);
  }
  return (
    <CenterCard>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="display text-3xl font-bold">Join your household</h1>
          <p className="text-muted">Pick the name your housemates will see.</p>
        </div>
        <Banner error={error} />
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
