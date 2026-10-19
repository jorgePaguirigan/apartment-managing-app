import { Landing } from "../_components/landing";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  return <Landing error={error as string | undefined} next={next as string | undefined} />;
}
