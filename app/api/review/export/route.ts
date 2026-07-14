import { NextResponse } from "next/server";
import { allReviews } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = [
  "rater_label", "expertise", "case_id", "model", "picks",
  "none_better", "vote_t_off", "vote_t_on", "vote_all40", "created_at",
];

function toCsv(rows: any[]): string {
  const esc = (v: any) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n") + "\n"
  );
}

// PUBLIC: download all review ballots as CSV (?format=json for JSON).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rows = await allReviews();
  if (url.searchParams.get("format") === "json") return NextResponse.json(rows);
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="p40_reviews.csv"',
      "cache-control": "no-store",
    },
  });
}
