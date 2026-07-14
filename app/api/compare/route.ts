import { NextResponse } from "next/server";
import { insertCompare, allCompares } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const A_RE = /^P\d{2}$/; // per-principle output ids
const B_RE = /^R\d{2}$/; // chain-round output ids

// One ballot = (rater, model): top-5 of method A + top-5 of method B.
// Re-saving allowed; consumers keep the latest per (rater, model).
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const rater = String(b?.raterLabel ?? "").trim();
    if (!rater) return NextResponse.json({ error: "reviewer name required" }, { status: 400 });
    const model = String(b?.model ?? "");
    if (!model) return NextResponse.json({ error: "model required" }, { status: 400 });
    const topA: string[] = Array.isArray(b?.topA) ? b.topA.map(String) : [];
    const topB: string[] = Array.isArray(b?.topB) ? b.topB.map(String) : [];
    if (topA.length > 5 || topA.some((x) => !A_RE.test(x)))
      return NextResponse.json({ error: "topA must be up to 5 of P01..P40" }, { status: 400 });
    if (topB.length > 5 || topB.some((x) => !B_RE.test(x)))
      return NextResponse.json({ error: "topB must be up to 5 of R01..R40" }, { status: 400 });

    await insertCompare({
      rater_label: rater.slice(0, 60),
      case_id: String(b?.caseId ?? "029"),
      model,
      top_a: topA,
      top_b: topB,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json(await allCompares());
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
