import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after Google sign-in, with a one-time `code`.
// Exchanging it (with the PKCE verifier stored in a cookie) creates the session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/auth/error?reason=oauth", origin));
}
