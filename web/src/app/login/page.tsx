import { lastAccount } from "@/lib/last-account";
import { Landing } from "../_components/landing";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, next, sent } = await searchParams;
  return <Landing last={await lastAccount()} error={error as string | undefined} next={next as string | undefined} sent={sent === "1"} />;
}
