import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase Auth callback handler (PKCE flow)
 *
 * Supabase redirects to this URL when the user clicks an email verification
 * or password reset link:
 *   /auth/callback?code=<pkce_code>&type=<signup|reset>
 *
 * type=signup  → email verified → /login?verified=1
 * type=reset   → password reset session → /auth/new-password
 * other        → /dashboard (compatibility with magic links etc.)
 *
 * Key: session cookies must be set directly on the NextResponse object.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "signup" | "reset" | null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Determine redirect destination based on type
  const destination =
    type === "signup"
      ? `${origin}/login?verified=1`
      : type === "reset"
      ? `${origin}/auth/new-password`
      : `${origin}/dashboard`;

  const redirectResponse = NextResponse.redirect(destination);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on both the request and the redirect response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return redirectResponse;
}
