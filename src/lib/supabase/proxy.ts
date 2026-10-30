import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "./env";

// Refreshes the user's session on every matching request and keeps the
// browser and server cookies in sync. Called from src/proxy.ts.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Never cache a response that sets auth cookies: it could hand one user's session to another.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Keep this call directly after creating the client: it verifies the
  // access token and refreshes it when it is about to expire.
  await supabase.auth.getClaims();

  // Return this exact response object so the refreshed cookies reach the browser.
  return response;
}
