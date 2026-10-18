import { joinHousehold } from "../../actions";
import { Banner, Page, button, input } from "../../_components/ui";

export default async function Join({ params, searchParams }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const { error } = await searchParams;
  return (
    <Page title="Join your household">
      <Banner error={error as string | undefined} />
      <form action={joinHousehold} className="space-y-3">
        <input type="hidden" name="code" value={code} />
        <label className="block space-y-1 text-sm">
          Your name
          <input name="display_name" required className={input} />
        </label>
        <button className={button}>Join</button>
      </form>
    </Page>
  );
}
