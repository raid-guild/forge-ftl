import { cookies } from "next/headers";
import { getLeaderboard, getPersonalBest, insertScore, type ScoreResult } from "@/lib/leaderboard";
import { SESSION_COOKIE, verifyLocalSession } from "@/lib/portal-session";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyLocalSession(cookieStore.get(SESSION_COOKIE)?.value);
  return Response.json({
    personalBest: session ? getPersonalBest(session.portalUserID) : null,
    top: getLeaderboard(10),
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifyLocalSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.authenticated) {
    return Response.json({ message: "Launch from the Portal to submit ranked scores." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const score = Math.max(0, Math.round(Number(body?.score ?? 0)));
  const floor = Math.max(1, Math.round(Number(body?.floor ?? 1)));
  const gold = Math.max(0, Math.round(Number(body?.gold ?? 0)));
  const durationMs = Math.max(0, Math.round(Number(body?.durationMs ?? 0)));
  const result: ScoreResult = body?.result === "won" ? "won" : "game-over";

  if (!Number.isFinite(score) || score <= 0) {
    return Response.json({ message: "Score must be greater than zero." }, { status: 400 });
  }

  const row = insertScore({
    durationMs,
    floor,
    gold,
    handle: session.handle,
    portalProfileID: session.portalProfileID,
    portalUserID: session.portalUserID,
    result,
    score,
  });

  return Response.json({ score: row, top: getLeaderboard(10), personalBest: getPersonalBest(session.portalUserID) });
}
