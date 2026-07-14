"use client";
// /review - manual rating of the p40 generation outputs.
// Flow: reviewer name gate -> problem accordion -> model tabs -> rate:
//   - 3 baseline prompts (TRIZ off / TRIZ on / all-40 attachment): like/dislike
//   - 40 per-principle prompts: star up to 3 best
// One ballot per (problem, model); saved ballots can be re-saved (latest wins).
import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";

type Output = {
  condition: string;
  kind: "baseline" | "keyword" | "all40" | "principle";
  label: string;
  principle_num: number | null;
  principle_name: string | null;
  model: string;
  words: number;
  text: string;
};
type Problem = { case_id: string; problem: string; source: string; outputs: Output[] };

type Ballot = {
  picks: string[];
  noneBetter: boolean;
  votes: Record<string, number>; // T_OFF / T_ON / T_ON_ALL40 -> 1|-1|0
  saved: boolean;
};

const BASELINES = ["T_OFF", "T_ON", "T_ON_ALL40"];
const emptyBallot = (): Ballot => ({ picks: [], noneBetter: false, votes: {}, saved: false });
const bkey = (cid: string, model: string) => `${cid}__${model}`;

export default function ReviewPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [rater, setRater] = useState({ label: "", expertise: "" });
  const [gateOpen, setGateOpen] = useState(true);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [modelTab, setModelTab] = useState<Record<string, string>>({});
  const [ballots, setBallots] = useState<Record<string, Ballot>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/p40_review.json")
      .then((r) => r.json())
      .then((d) => setProblems(d.problems));
    try {
      const r = JSON.parse(localStorage.getItem("p40_rater") || "null");
      if (r?.label) {
        setRater(r);
        setGateOpen(false);
      }
      const b = JSON.parse(localStorage.getItem("p40_ballots") || "null");
      if (b) setBallots(b);
    } catch {}
  }, []);

  const persistBallots = useCallback((next: Record<string, Ballot>) => {
    setBallots(next);
    try {
      localStorage.setItem("p40_ballots", JSON.stringify(next));
    } catch {}
  }, []);

  const models = useMemo(() => {
    const s = new Set<string>();
    problems.forEach((p) => p.outputs.forEach((o) => s.add(o.model)));
    return Array.from(s).sort();
  }, [problems]);

  const ballot = (cid: string, model: string): Ballot => ballots[bkey(cid, model)] ?? emptyBallot();

  const update = (cid: string, model: string, fn: (b: Ballot) => Ballot) => {
    const k = bkey(cid, model);
    const next = { ...ballots, [k]: { ...fn(ballot(cid, model)), saved: false } };
    persistBallots(next);
  };

  const toggleStar = (cid: string, model: string, p: string) =>
    update(cid, model, (b) => {
      const has = b.picks.includes(p);
      if (!has && b.picks.length >= 3) return b; // max 3
      return {
        ...b,
        picks: has ? b.picks.filter((x) => x !== p) : [...b.picks, p],
        noneBetter: false,
      };
    });

  const toggleVote = (cid: string, model: string, cond: string, v: number) =>
    update(cid, model, (b) => ({
      ...b,
      votes: { ...b.votes, [cond]: b.votes[cond] === v ? 0 : v },
    }));

  const save = async (cid: string, model: string) => {
    const k = bkey(cid, model);
    const b = ballot(cid, model);
    setSaving(k);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          raterLabel: rater.label,
          expertise: rater.expertise || undefined,
          caseId: cid,
          model,
          picks: b.picks,
          noneBetter: b.noneBetter,
          votes: b.votes,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "save failed");
      persistBallots({ ...ballots, [k]: { ...b, saved: true } });
    } catch (e: any) {
      alert(`Could not save: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  const savedCount = (cid: string) =>
    models.filter((m) => ballots[bkey(cid, m)]?.saved).length;

  if (gateOpen) {
    return (
      <Shell>
        <div className="glass mx-auto mt-16 max-w-lg rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white">Output review</h1>
          <p className="mt-2 text-sm text-slate-400">
            Rate the model outputs per problem: star the best principle prompts (up to 3) and
            like/dislike the baseline prompts. Your name is stored with every rating.
          </p>
          <label className="mt-6 block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Your name (required)</span>
            <input
              value={rater.label}
              onChange={(e) => setRater((r) => ({ ...r, label: e.target.value }))}
              placeholder="e.g. Almubdi"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-sky-400/60"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Background (optional)</span>
            <input
              value={rater.expertise}
              onChange={(e) => setRater((r) => ({ ...r, expertise: e.target.value }))}
              placeholder="e.g. TRIZ-familiar"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-sky-400/60"
            />
          </label>
          <button
            disabled={!rater.label.trim()}
            onClick={() => {
              localStorage.setItem("p40_rater", JSON.stringify(rater));
              setGateOpen(false);
            }}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 font-semibold text-white disabled:opacity-40"
          >
            Start reviewing
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Output review</h1>
          <p className="text-xs text-slate-500">
            reviewer: <b className="text-slate-300">{rater.label}</b>{" "}
            <button
              className="ml-1 underline hover:text-slate-300"
              onClick={() => setGateOpen(true)}
            >
              change
            </button>
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <a href="/" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">2AFC game</a>
          <a href="/compare" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">Method comparison</a>
          <a href="/review/dashboard" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">Dashboard →</a>
        </nav>
      </header>

      <p className="mb-4 text-sm text-slate-400">
        {problems.length} problems · {models.length} models · per model: ⭐ up to 3 best of the 40
        principle prompts, 👍/👎 the three baselines. Save each (problem, model) ballot.
      </p>

      <div className="space-y-3">
        {problems.map((p) => {
          const open = openCase === p.case_id;
          const tab = modelTab[p.case_id] ?? models[0];
          const b = ballot(p.case_id, tab);
          const outs = p.outputs.filter((o) => o.model === tab);
          const base = outs.filter((o) => o.kind !== "principle");
          const princ = outs.filter((o) => o.kind === "principle");
          return (
            <div key={p.case_id} className="glass rounded-2xl">
              <button
                onClick={() => setOpenCase(open ? null : p.case_id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
              >
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-sky-300">{p.case_id}</span>
                <span className="flex-1 truncate text-sm text-slate-300">{p.problem.slice(0, 110)}…</span>
                <span className={`text-xs ${savedCount(p.case_id) === models.length ? "text-emerald-400" : "text-slate-500"}`}>
                  {savedCount(p.case_id)}/{models.length} saved
                </span>
                <span className="text-slate-500">{open ? "▾" : "▸"}</span>
              </button>

              {open && (
                <div className="border-t border-white/10 px-5 py-4">
                  <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{p.problem}</p>

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {models.map((m) => (
                      <button
                        key={m}
                        onClick={() => setModelTab((t) => ({ ...t, [p.case_id]: m }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          tab === m ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40" : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {m} {ballots[bkey(p.case_id, m)]?.saved ? "✓" : ""}
                      </button>
                    ))}
                  </div>

                  {/* baselines: like / dislike */}
                  <div className="mb-4 grid gap-3 lg:grid-cols-3">
                    {base.map((o) => {
                      const v = b.votes[o.condition] ?? 0;
                      const ek = `${p.case_id}|${tab}|${o.condition}`;
                      return (
                        <div key={o.condition} className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-amber-300">{o.label}</span>
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => toggleVote(p.case_id, tab, o.condition, 1)}
                                className={`rounded-md px-2 py-1 text-sm ${v === 1 ? "bg-emerald-500/30" : "bg-white/5 hover:bg-white/10"}`}
                                title="like"
                              >👍</button>
                              <button
                                onClick={() => toggleVote(p.case_id, tab, o.condition, -1)}
                                className={`rounded-md px-2 py-1 text-sm ${v === -1 ? "bg-rose-500/30" : "bg-white/5 hover:bg-white/10"}`}
                                title="dislike"
                              >👎</button>
                            </span>
                          </div>
                          <ClampText id={ek} text={o.text} expanded={expanded} setExpanded={setExpanded} />
                          <span className="mt-1 block text-[10px] text-slate-500">{o.words} words (full output)</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* the 40 principle outputs */}
                  <div className="grid gap-3 lg:grid-cols-2">
                    {princ.map((o) => {
                      const pid = `P${String(o.principle_num).padStart(2, "0")}`;
                      const starred = b.picks.includes(pid);
                      const ek = `${p.case_id}|${tab}|${o.condition}`;
                      return (
                        <div
                          key={o.condition}
                          className={`rounded-xl border p-3 transition ${
                            starred ? "border-yellow-400/60 bg-yellow-400/10" : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-200">
                              <span className="font-mono text-sky-300">{pid}</span> {o.principle_name}
                            </span>
                            <button
                              onClick={() => toggleStar(p.case_id, tab, pid)}
                              className={`rounded-md px-2 py-1 text-base leading-none ${starred ? "bg-yellow-400/25" : "bg-white/5 hover:bg-white/10"}`}
                              title="star as one of the 3 best"
                            >
                              {starred ? "★" : "☆"}
                            </button>
                          </div>
                          <ClampText id={ek} text={o.text} expanded={expanded} setExpanded={setExpanded} />
                        </div>
                      );
                    })}
                  </div>

                  {/* sticky ballot bar */}
                  <div className="sticky bottom-3 mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0d1a]/95 px-4 py-3 shadow-xl">
                    <span className="text-sm text-slate-300">
                      ⭐ {b.picks.length}/3 {b.picks.length > 0 && <span className="font-mono text-xs text-yellow-300">({b.picks.join(", ")})</span>}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={b.noneBetter}
                        onChange={() =>
                          update(p.case_id, tab, (x) => ({ ...x, noneBetter: !x.noneBetter, picks: [] }))
                        }
                      />
                      none of the 40 beats the baselines
                    </label>
                    <span className="flex-1" />
                    {b.saved && <span className="text-xs text-emerald-400">saved ✓</span>}
                    <button
                      onClick={() => save(p.case_id, tab)}
                      disabled={saving === bkey(p.case_id, tab) || (b.picks.length === 0 && !b.noneBetter)}
                      className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {saving === bkey(p.case_id, tab) ? "Saving…" : b.saved ? "Re-save ballot" : "Save ballot"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function ClampText({
  id, text, expanded, setExpanded,
}: {
  id: string;
  text: string;
  expanded: Record<string, boolean>;
  setExpanded: (f: (e: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  const isOpen = expanded[id];
  return (
    <div>
      <p className={`whitespace-pre-wrap text-[13px] leading-relaxed text-slate-400 ${isOpen ? "" : "line-clamp-3"}`}>
        {text}
      </p>
      <button
        onClick={() => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
        className="mt-1 text-[11px] text-sky-400 hover:underline"
      >
        {isOpen ? "collapse ▴" : "read full ▾"}
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">{children}</div>
    </main>
  );
}
