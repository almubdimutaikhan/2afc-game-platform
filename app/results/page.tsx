"use client";
import { useEffect, useState } from "react";

type Group = Record<string, { n: number; trizWinRate: number }>;
type Stats = {
  n: number;
  sessions: number;
  trizWinRate: number;
  leftChosenRate: number;
  byModel: Group;
  byCase: Group;
  byExpertise: Group;
};

function Bar({ label, n, rate }: { label: string; n: number; rate: number }) {
  const pct = Math.round(rate * 100);
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span className="truncate font-mono">{label || "—"}</span>
        <span>
          {pct}% <span className="text-slate-600">(n={n})</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, group }: { title: string; group: Group }) {
  const entries = Object.entries(group || {});
  if (!entries.length) return null;
  return (
    <div className="glass mt-5 rounded-2xl p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      {entries.map(([k, v]) => (
        <Bar key={k} label={k} n={v.n} rate={v.trizWinRate} />
      ))}
    </div>
  );
}

export default function ResultsPage() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState("");

  const load = (t: string) => {
    setErr("");
    fetch(`/api/stats?token=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unauthorized"))))
      .then(setStats)
      .catch((e) => setErr(String(e.message || e)));
  };

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
    if (t) load(t);
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">Results dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Live aggregate of collected 2AFC responses. TRIZ win rate = share of choices that landed on
        the TRIZ-guided solution.
      </p>

      <div className="mt-5 flex gap-2">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="EXPORT_TOKEN"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm outline-none focus:border-sky-400/60"
        />
        <button
          onClick={() => load(token)}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold"
        >
          Load
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">Error: {err}</p>}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["responses", stats.n],
              ["sessions", stats.sessions],
              ["TRIZ win", `${Math.round(stats.trizWinRate * 100)}%`],
              ["left-pick", `${Math.round(stats.leftChosenRate * 100)}%`],
            ].map(([k, v]) => (
              <div key={k as string} className="glass rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold">{v as any}</div>
                <div className="text-xs text-slate-400">{k as string}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            left-pick near 50% means position bias is controlled. Download raw rows at{" "}
            <code className="text-slate-400">/api/export?token=…</code>
          </p>

          <Section title="TRIZ win rate by model" group={stats.byModel} />
          <Section title="By rater background" group={stats.byExpertise} />
          <Section title="By problem (case)" group={stats.byCase} />
        </>
      )}
    </main>
  );
}
