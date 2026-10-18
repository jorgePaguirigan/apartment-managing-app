import { createClient } from "@/lib/supabase/server";
import { submitClaim } from "../actions";
import { Section, button, input } from "./ui";

type ClaimRow = { id: string; status: string; note: string | null; deed: { name: string; points: number } | null };

export async function HousemateView() {
  const supabase = await createClient();
  const [{ data: deeds }, { data: claims }] = await Promise.all([
    supabase.from("deed").select("id, name, points").eq("kind", "good").eq("active", true).order("name"),
    supabase.from("claim").select("id, status, note, deed:deed_id(name, points)").order("created_at", { ascending: false }).limit(20),
  ]);
  return (
    <>
      <Section title="I did…">
        {deeds?.length ? (
          <ul className="space-y-2">
            {deeds.map((d) => (
              <li key={d.id}>
                <form action={submitClaim} className="flex items-center gap-2">
                  <input type="hidden" name="deed" value={d.id} />
                  <input name="note" placeholder="Note (optional)" aria-label={`Note for ${d.name}`} className={input} />
                  <button className={`${button} whitespace-nowrap`}>{d.name} +{d.points}</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">Your admin has not added any deeds yet.</p>
        )}
      </Section>
      <Section title="My claims">
        <ul className="space-y-1 text-sm">
          {((claims ?? []) as unknown as ClaimRow[]).map((c) => (
            <li key={c.id}>{c.deed?.name} · {c.status}{c.note ? ` · ${c.note}` : ""}</li>
          ))}
          {!claims?.length && <li className="text-zinc-600">No claims yet.</li>}
        </ul>
      </Section>
    </>
  );
}
