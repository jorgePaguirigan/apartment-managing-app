import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
      const u = data.user;
      const full = String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? "");
      res.cookies.set("last_account", JSON.stringify({ name: full.split(" ")[0] || u.email, email: u.email }), {
        httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production",
      });
      return res;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=${"bad-link"}`);
}
