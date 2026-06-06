import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PAGE_ROUTES = ["/dashboard", "/profile", "/ai-guidance", "/guardian"];
const PROTECTED_API_ROUTES = ["/api/analyse"];
const AUTH_ROUTES = ["/login"];
// /auth/* paths are callback/confirm pages — always let them through
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // JWT exists but user has been deleted (403) → clear session cookies immediately
  if (authError && (authError.status === 403 || authError.message?.includes("does not exist"))) {
    const clearResponse = NextResponse.redirect(new URL("/login", request.url));
    // Expire all Supabase session-related cookies
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) {
        clearResponse.cookies.set(name, "", { maxAge: 0, path: "/" });
      }
    });
    return clearResponse;
  }

  // /auth/* (callback, confirm, etc.) always passes through regardless of auth state
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
