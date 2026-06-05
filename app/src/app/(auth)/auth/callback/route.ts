import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase Auth 콜백 핸들러 (PKCE flow)
 *
 * 이메일 인증 / 비밀번호 재설정 링크 클릭 시 Supabase가 이 URL로 리다이렉트한다:
 *   /auth/callback?code=<pkce_code>&type=<signup|reset>
 *
 * type=signup  → 이메일 인증 완료 → /login?verified=1
 * type=reset   → 비밀번호 재설정 세션 → /auth/new-password
 * 그 외         → /dashboard (기존 magic link 등 호환)
 *
 * 핵심: 세션 쿠키는 NextResponse 객체에 직접 설정해야 한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "signup" | "reset" | null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // type에 따라 리다이렉트 목적지 결정
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
          // request와 redirect 응답 양쪽에 쿠키를 설정한다
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
