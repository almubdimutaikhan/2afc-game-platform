import { NextResponse } from "next/server";
import { insertReview, allReviews } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PICK_RE = /^P\d{2}$/;
const vote = (v: any) => (v === 1 || v === -1 ? v : 0);

// Save one ballot: (rater, problem, model) -> up to 3 principle picks +
// baseline like/dislike votes. Re-saving is allowed; consumers keep the
// latest ballot per (rater, case, model).
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const rater = String(b?.raterLabel ?? "").trim();
    if (!rater) return NextResponse.json({ error: "reviewer name required" }, { status: 400 });
    const caseId = String(b?.caseId ?? "");
    const model = String(b?.model ?? "");
    if (!caseId || !model) {
      return NextResponse.json({ error: "caseId and model required" }, { status: 400 });
    }
    const picks: string[] = Array.isArray(b?.picks) ? b.picks.map(String) : [];
    if (picks.length > 3 || picks.some((p) => !PICK_RE.test(p))) {
      return NextResponse.json({ error: "picks must be up to 3 of P01..P40" }, { status: 400 });
    }

    await insertReview({
      rater_label: rater.slice(0, 60),
      expertise: b?.expertise ? String(b.expertise).slice(0, 60) : null,
      case_id: caseId,
      model,
      picks,
      none_better: Boolean(b?.noneBetter),
      vote_t_off: vote(b?.votes?.T_OFF),
      vote_t_on: vote(b?.votes?.T_ON),
      vote_all40: vote(b?.votes?.T_ON_ALL40),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// All ballots (JSON) - feeds the dashboard.
export async function GET() {
  try {
    return NextResponse.json(await allReviews());
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
