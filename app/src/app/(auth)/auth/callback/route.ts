import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase 이메일 링크(magic link / PKCE) 콜백 핸들러
 *
 * 이메일 링크 클릭 시 Supabase는 이 URL로 리다이렉트한다:
 *   /auth/callback?code=<pkce_code>
 *
 * 여기서 code 를 세션으로 교환하고 /dashboard 로 보낸다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    // 코드가 없으면 로그인 페이지로 (에러 표시)
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 컨텍스트에서는 set이 불가할 수 있으나 무시
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // 세션 교환 성공 → 확인 페이지로
  return NextResponse.redirect(`${origin}/auth/confirm`);
}
