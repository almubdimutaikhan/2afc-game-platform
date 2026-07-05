import { NextResponse } from "next/server";
import { allResponses } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = [
  "id", "created_at", "session_id", "rater_label", "expertise", "pair_id",
  "case_id", "model", "triz_side", "chosen_side", "chosen_arm",
  "round_index", "time_ms", "user_agent",
];

function toCsv(rows: any[]): string {
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n") + "\n"
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (process.env.EXPORT_TOKEN && url.searchParams.get("token") !== process.env.EXPORT_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await allResponses();
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json(rows);
  }
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="triz_2afc_responses.csv"',
    },
  });
}
