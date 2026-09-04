import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Protect routes and auto-redirect logged-in users away from /login
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const pathname = request.nextUrl.pathname;

  // 1) Logged-in user should not see /login → dashboard
  if (pathname.startsWith("/login") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2) Dashboard requires auth
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/api/auth/signin?callbackUrl=/dashboard", request.url));
  }

  // 3) Admin / Developers protection (env + DB via JWT)
  if (pathname.startsWith("/admin") || pathname.startsWith("/developers")) {
    const isDevelopers = pathname.startsWith("/developers");
    if (!token) {
      const cb = isDevelopers ? "/developers" : "/admin";
      return NextResponse.redirect(new URL(`/api/auth/signin?callbackUrl=${cb}`, request.url));
    }
    const email = typeof token?.email === "string" ? token.email.toLowerCase() : "";
    const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isEnvAdmin = Boolean(email && emails.includes(email));
    const isTokenAdmin = Boolean((token as any).isAdmin);
    const isAdmin = isEnvAdmin || isTokenAdmin;
    if (!email || !isAdmin) return NextResponse.redirect(new URL("/?error=admin_access_required", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/developers/:path*", "/developers", "/login", "/dashboard/:path*", "/dashboard"] };
