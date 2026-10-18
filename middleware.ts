import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login route, auth api, and static files
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/status") ||
    pathname.startsWith("/api/submit")
  ) {
    return NextResponse.next();
  }

  // Check routes requiring admin auth: /admin, /qr, /api/admin/*
  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/qr") ||
    pathname.startsWith("/api/admin");

  if (isAdminRoute) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionSecret = process.env.SESSION_SECRET || "";

    const isAuthenticated = sessionSecret ? await verifySessionToken(sessionCookie, sessionSecret) : false;

    if (!isAuthenticated) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/qr", "/api/admin/:path*"],
};
