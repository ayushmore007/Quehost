import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const password = body?.password;

    const expectedPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.SESSION_SECRET || "quehost_session_secret_9f83a7c2b4e105d862f91a3c75e4b2d0";

    if (!expectedPassword) {
      console.error("ADMIN_PASSWORD is not configured in environment variables.");
      return NextResponse.json(
        { error: "Server authentication is not configured properly." },
        { status: 500 }
      );
    }

    const cleanInputPassword = String(password || "").trim();
    const cleanExpectedPassword = String(expectedPassword).trim();

    if (!cleanInputPassword || cleanInputPassword !== cleanExpectedPassword) {
      return NextResponse.json(
        { error: "Invalid admin password." },
        { status: 401 }
      );
    }

    // Create signed token
    const token = await createSessionToken(sessionSecret);

    const host = request.headers.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    const isHttps = request.headers.get("x-forwarded-proto") === "https";
    const secureCookie = isHttps || (!isLocalhost && process.env.NODE_ENV === "production");

    const response = NextResponse.json({ success: true });

    // Set signed httpOnly cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
