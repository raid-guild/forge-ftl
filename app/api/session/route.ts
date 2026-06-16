import { cookies } from "next/headers";
import { anonymousSession, SESSION_COOKIE, verifyLocalSession } from "@/lib/portal-session";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyLocalSession(cookieStore.get(SESSION_COOKIE)?.value) ?? anonymousSession();
  return Response.json(session);
}
