"use client";
// /review/dashboard - live aggregation of the p40 review ballots:
// per problem, the top-3 most-starred principle prompts (out of 40), the
// like/dislike tallies on the three baseline prompts, and rater coverage.
// Only the LATEST ballot per (rater, problem, model) counts.
import { useEffect, useMemo, useState } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";

type Ballot = {
  rater_label: string;
  case_id: string;
  model: string;
  picks: string[];
  none_better: boolean;
  vote_t_off: number;
  vote_t_on: number;
  vote_all40: number;
  created_at: string | null;
};
type Problem = { case_id: string; problem: string; outputs: any[] };

const BASE_LABELS: [keyof Ballot, string][] = [
  ["vote_t_off", "TRIZ off (baseline)"],
  ["vote_t_on", "TRIZ on (keyword)"],
  ["vote_all40", "TRIZ on + all-40 attachment"],
];

export default function Dashboard() {
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/review").then((r) => r.json()),
      fetch("/p40_review.json").then((r) => r.json()),
    ])
      .then(([b, d]) => {
        setBallots(Array.isArray(b) ? b : []);
        setProblems(d.problems);
        const nm: Record<string, string> = {};
        d.problems.forEach((p: Problem) =>
          p.outputs.forEach((o: any) => {
            if (o.principle_num)
              nm[`P${String(o.principle_num).padStart(2, "0")}`] = o.principle_name;
          }),
        );
        setNames(nm);
      })
      .finally(() => setLoading(false));
  }, []);

  // latest ballot per (rater, case, model)
  const latest = useMemo(() => {
    const m = new Map<string, Ballot>();
    for (const b of ballots) {
      const k = `${b.rater_label}|${b.case_id}|${b.model}`;
      const prev = m.get(k);
      if (!prev || String(b.created_at) > String(prev.created_at)) m.set(k, b);
    }
    return Array.from(m.values());
  }, [ballots]);

  const perProblem = useMemo(() => {
    return problems.map((p) => {
      const bs = latest.filter((b) => b.case_id === p.case_id);
      const stars = new Map<string, number>();
      bs.forEach((b) => (b.picks || []).forEach((x) => stars.set(x, (stars.get(x) || 0) + 1)));
      const top = Array.from(stars.entries()).sort((a, z) => z[1] - a[1]);
      const base = BASE_LABELS.map(([k, label]) => ({
        label,
        up: bs.filter((b) => (b as any)[k] === 1).length,
        down: bs.filter((b) => (b as any)[k] === -1).length,
      }));
      return {
        case_id: p.case_id,
        problem: p.problem,
        nBallots: bs.length,
        raters: new Set(bs.map((b) => b.rater_label)).size,
        noneBetter: bs.filter((b) => b.none_better).length,
        top3: top.slice(0, 3),
        allStars: top,
        base,
      };
    });
  }, [problems, latest]);

  const overall = useMemo(() => {
    const stars = new Map<string, number>();
    latest.forEach((b) => (b.picks || []).forEach((x) => stars.set(x, (stars.get(x) || 0) + 1)));
    return Array.from(stars.entries()).sort((a, z) => z[1] - a[1]).slice(0, 10);
  }, [latest]);

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Review dashboard</h1>
            <p className="text-xs text-slate-500">
              {latest.length} ballots · {new Set(latest.map((b) => b.rater_label)).size} reviewers
              · latest ballot per (reviewer, problem, model) counts
            </p>
          </div>
          <nav className="flex gap-2 text-sm">
            <a href="/review" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">← Review</a>
            <a href="/api/review/export" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">⬇ ballots.csv</a>
          </nav>
        </header>

        {loading && <p className="text-slate-400">Loading…</p>}
        {!loading && latest.length === 0 && (
          <p className="text-slate-400">No ballots yet — rate some outputs in the Review tab first.</p>
        )}

        <div className="space-y-4">
          {perProblem.map((p) => (
            <div key={p.case_id} className="glass rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">{p.case_id}</span>
                <span className="flex-1 truncate text-sm text-slate-300">{p.problem.slice(0, 100)}…</span>
                <span className="text-xs text-slate-500">{p.nBallots} ballots / {p.raters} reviewers</span>
              </div>

              {p.top3.length > 0 ? (
                <div className="mb-3 space-y-1.5">
                  {p.top3.map(([pid, n], i) => {
                    const max = p.top3[0][1];
                    return (
                      <div key={pid} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-right text-slate-500">{["🥇", "🥈", "🥉"][i]}</span>
                        <span className="w-40 truncate">
                          <span className="font-mono text-sky-300">{pid}</span>{" "}
                          <span className="text-slate-300">{names[pid]}</span>
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                            style={{ width: `${(n / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-xs text-slate-400">{n}★</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mb-3 text-xs text-slate-500">no principle stars yet</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                {p.base.map((b) => (
                  <span key={b.label} className="rounded-lg border border-amber-300/20 bg-amber-400/5 px-2.5 py-1 text-slate-300">
                    {b.label}: <span className="text-emerald-400">👍{b.up}</span>{" "}
                    <span className="text-rose-400">👎{b.down}</span>
                  </span>
                ))}
                {p.noneBetter > 0 && (
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">
                    “none beats baselines”: {p.noneBetter}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {overall.length > 0 && (
          <div className="glass mt-6 rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Overall — most-starred principles (all problems)</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {overall.map(([pid, n]) => (
                <span key={pid} className="rounded-lg bg-white/5 px-2.5 py-1 text-slate-300">
                  <span className="font-mono text-sky-300">{pid}</span> {names[pid]} — {n}★
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
