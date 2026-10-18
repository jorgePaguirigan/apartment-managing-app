import { signIn } from "../actions";
import { Banner, Page, button, input } from "../_components/ui";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, sent, next } = await searchParams;
  return (
    <Page title="Sign in">
      <Banner error={error as string | undefined} info={sent ? "Check your email for the sign-in link." : undefined} />
      <form action={signIn} className="space-y-3">
        <input type="hidden" name="next" value={(next as string | undefined) ?? "/"} />
        <label className="block space-y-1 text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <button className={button}>Email me a link</button>
      </form>
    </Page>
  );
}

// Per-user pages: render on request.
export const instant = false;
