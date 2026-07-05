import { NextResponse } from "next/server";
import { allResponses } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (process.env.EXPORT_TOKEN && url.searchParams.get("token") !== process.env.EXPORT_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await allResponses();
  const n = rows.length;
  const trizWins = rows.filter((r) => r.chosen_arm === "triz").length;
  const leftChosen = rows.filter((r) => r.chosen_side === "left").length;

  const group = (key: string) => {
    const m: Record<string, { n: number; triz: number }> = {};
    for (const r of rows) {
      const k = r[key];
      (m[k] ||= { n: 0, triz: 0 }).n++;
      if (r.chosen_arm === "triz") m[k].triz++;
    }
    return Object.fromEntries(
      Object.entries(m)
        .sort()
        .map(([k, v]) => [k, { n: v.n, trizWinRate: v.triz / v.n }]),
    );
  };

  return NextResponse.json({
    n,
    sessions: new Set(rows.map((r) => r.session_id)).size,
    trizWinRate: n ? trizWins / n : 0,
    leftChosenRate: n ? leftChosen / n : 0, // position-bias diagnostic (~0.5 expected)
    byModel: group("model"),
    byCase: group("case_id"),
    byExpertise: group("expertise"),
  });
}
