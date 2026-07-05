import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildSession } from "@/lib/pairs";
import { sign } from "@/lib/sign";
import type { ClientRound } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let n = 20;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.n)) n = Math.max(1, Math.min(100, Math.floor(body.n)));
  } catch {
    /* default n */
  }

  const sessionId = crypto.randomUUID();
  const rounds = buildSession(n);

  const clientRounds: ClientRound[] = rounds.map((r, i) => ({
    roundIndex: i,
    problem: r.problem,
    left: r.left,
    right: r.right,
    // opaque, signed: the browser cannot read which side is TRIZ
    token: sign({
      sid: sessionId,
      ri: i,
      pid: r.pairId,
      cid: r.caseId,
      model: r.model,
      ts: r.trizSide,
    }),
  }));

  return NextResponse.json({ sessionId, rounds: clientRounds });
}
