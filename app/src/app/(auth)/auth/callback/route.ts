import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase 이메일 링크(magic link / PKCE) 콜백 핸들러
 *
 * 이메일 링크 클릭 시 Supabase는 이 URL로 리다이렉트한다:
 *   /auth/callback?code=<pkce_code>
 *
 * 핵심: 쿠키는 NextResponse 객체에 직접 설정해야 한다.
 * cookieStore.set()은 Route Handler의 redirect 응답에 반영되지 않는다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // 리다이렉트 응답을 먼저 생성하고, 여기에 쿠키를 직접 설정한다
  const redirectResponse = NextResponse.redirect(`${origin}/auth/confirm`);

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

  // 세션 쿠키가 담긴 리다이렉트 응답 반환
  return redirectResponse;
}
