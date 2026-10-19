import { cookies } from "next/headers";

export type LastAccount = { name: string; email: string };

// Who signed in last on this browser. Only used to pre-fill Google's account choice; it grants no access.
export async function lastAccount(): Promise<LastAccount | null> {
  try {
    const raw = (await cookies()).get("last_account")?.value;
    const a = raw ? JSON.parse(raw) : null;
    return a?.name && a?.email ? { name: String(a.name), email: String(a.email) } : null;
  } catch {
    return null;
  }
}
