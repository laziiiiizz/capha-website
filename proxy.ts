// This file is Next.js Middleware — code that runs on every matching request
// BEFORE the page is rendered. It is the right place for auth checks because
// no page code executes (and no data is fetched) until the middleware allows it.
// Learn more: https://nextjs.org/docs/app/building-your-application/routing/middleware
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  // Detect whether the current URL is under /admin or is the login page itself.
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/admin/login";

  // Non-admin pages need no auth check — let them through immediately.
  if (!isAdminRoute) return NextResponse.next();

  // We need a mutable response object so we can attach refreshed session cookies
  // before returning. We keep updating `response` in the setAll callback below.
  let response = NextResponse.next({ request });

  // createServerClient reads/writes auth cookies from the request/response.
  // This is the SSR-safe way to use Supabase in middleware — the regular browser
  // client doesn't work here because there's no window or localStorage.
  // Learn more: https://supabase.com/docs/guides/auth/server-side/nextjs
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the incoming request.
        getAll() { return request.cookies.getAll(); },
        // When Supabase refreshes a session it calls setAll so the new tokens
        // are saved into both the request (for this run) and the response (sent back
        // to the browser so the next request also has the fresh tokens).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() makes a secure server-side call to Supabase to verify the session.
  // Never use getSession() for auth checks — it only reads the local cookie and
  // can be spoofed. getUser() validates the token with the Supabase server.
  // Learn more: https://supabase.com/docs/reference/javascript/auth-getuser
  const { data: { user } } = await supabase.auth.getUser();

  // If someone tries to visit any /admin/* page without being logged in,
  // redirect them to the login page so they can authenticate.
  if (!isLoginRoute && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // If a logged-in user visits /admin/login, skip the login form and send
  // them straight to the bookings dashboard — no need to log in again.
  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL("/admin/bookings", request.url));
  }

  // User is authenticated and on a valid admin page — let the request proceed,
  // carrying any refreshed session cookies in `response`.
  return response;
}

// The config matcher tells Next.js which URL patterns this middleware should run on.
// "/admin/:path*" matches /admin and every path under it (e.g. /admin/bookings).
// Pages outside this pattern are completely unaffected.
// Learn more: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ["/admin/:path*"],
};
