import { Landing } from "../_components/landing";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, sent, next, mode } = await searchParams;
  return <Landing error={error as string | undefined} sent={!!sent} next={next as string | undefined} mode={mode as string | undefined} />;
}
