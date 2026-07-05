import { NextResponse } from "next/server";
import { verify } from "@/lib/sign";
import { insertResponse } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TokenMeta = {
  sid: string;
  ri: number;
  pid: string;
  cid: string;
  model: string;
  ts: "left" | "right";
};

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const { token, chosenSide, timeMs, raterLabel, expertise, sessionId } = b ?? {};

    if (chosenSide !== "left" && chosenSide !== "right") {
      return NextResponse.json({ error: "bad chosenSide" }, { status: 400 });
    }
    const meta = verify<TokenMeta>(token);
    if (!meta) return NextResponse.json({ error: "bad token" }, { status: 400 });
    if (sessionId && sessionId !== meta.sid) {
      return NextResponse.json({ error: "session mismatch" }, { status: 400 });
    }

    const chosenArm = chosenSide === meta.ts ? "triz" : "control";

    await insertResponse({
      sessionId: meta.sid,
      raterLabel: raterLabel ?? null,
      expertise: expertise ?? null,
      pairId: meta.pid,
      caseId: meta.cid,
      model: meta.model,
      trizSide: meta.ts,
      chosenSide,
      chosenArm,
      roundIndex: meta.ri,
      timeMs: typeof timeMs === "number" ? timeMs : 0,
      userAgent: req.headers.get("user-agent"),
    });

    // chosenArm is returned so the client can tally the end-screen reveal
    return NextResponse.json({ ok: true, chosenArm });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
