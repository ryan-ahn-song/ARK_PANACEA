import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PAGE_ROUTES = ["/dashboard", "/profile", "/ai-guidance", "/guardian"];
const PROTECTED_API_ROUTES = ["/api/analyse"];
const AUTH_ROUTES = ["/login"];
// /auth/* 경로는 콜백·확인 페이지이므로 항상 통과시킨다
const PUBLIC_AUTH_PATHS = ["/auth/"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // /auth/* (callback, confirm 등)는 인증 여부와 무관하게 항상 통과
  if (matchesRoute(pathname, PUBLIC_AUTH_PATHS)) {
    return supabaseResponse;
  }

  if (matchesRoute(pathname, PROTECTED_API_ROUTES) && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (matchesRoute(pathname, PROTECTED_PAGE_ROUTES) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (matchesRoute(pathname, AUTH_ROUTES) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
