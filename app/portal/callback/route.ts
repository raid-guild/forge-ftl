import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionFromClaims,
  signLocalSession,
  verifyPortalLaunchToken,
} from "@/lib/portal-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?launch=missing", url.origin));
  }

  try {
    const claims = verifyPortalLaunchToken(token);
    const session = sessionFromClaims(claims);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, signLocalSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return NextResponse.redirect(new URL("/", url.origin));
  } catch (error) {
    console.warn("Portal launch rejected.", {
      reason: error instanceof Error ? error.message : "Unknown launch verification error.",
    });
    return NextResponse.redirect(new URL("/?launch=invalid", url.origin));
  }
}
