"use client";
// /compare - method comparison for the Mars haptic-boot problem:
//   Method A: 40 per-principle outputs (one per TRIZ inventive principle)
//   Method B: 40 iterative-chain outputs (each round forbidden to repeat earlier ones)
// Flow per model: rank & star top 5 in each set -> "Compare top 5s" button ->
// filtered side-by-side view of the 10 selected solutions. Ballots stored per
// (reviewer, model); latest wins.
import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";

type Item = { id: string; title: string; text: string; words: number };
type Data = {
  case_id: string;
  problem: string;
  models: string[];
  methodA: { label: string; outputs: Record<string, Item[]> };
  methodB: { label: string; outputs: Record<string, Item[]> };
};
type Sel = { topA: string[]; topB: string[]; saved: boolean };

const emptySel = (): Sel => ({ topA: [], topB: [], saved: false });

export default function ComparePage() {
  const [data, setData] = useState<Data | null>(null);
  const [rater, setRater] = useState({ label: "", expertise: "" });
  const [gateOpen, setGateOpen] = useState(true);
  const [model, setModel] = useState<string>("");
  const [sels, setSels] = useState<Record<string, Sel>>({});
  const [view, setView] = useState<"rank" | "compare">("rank");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/boot_compare.json")
      .then((r) => r.json())
      .then((d: Data) => {
        setData(d);
        setModel(d.models[0]);
      });
    try {
      const r = JSON.parse(localStorage.getItem("p40_rater") || "null");
      if (r?.label) {
        setRater(r);
        setGateOpen(false);
      }
      const s = JSON.parse(localStorage.getItem("boot_compare_sels") || "null");
      if (s) setSels(s);
    } catch {}
  }, []);

  const persist = useCallback((next: Record<string, Sel>) => {
    setSels(next);
    try {
      localStorage.setItem("boot_compare_sels", JSON.stringify(next));
    } catch {}
  }, []);

  const sel = sels[model] ?? emptySel();

  const toggle = (side: "topA" | "topB", id: string) => {
    const cur = sel[side];
    const has = cur.includes(id);
    if (!has && cur.length >= 5) return;
    persist({
      ...sels,
      [model]: {
        ...sel,
        [side]: has ? cur.filter((x) => x !== id) : [...cur, id],
        saved: false,
      },
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          raterLabel: rater.label,
          caseId: data?.case_id,
          model,
          topA: sel.topA,
          topB: sel.topB,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "save failed");
      persist({ ...sels, [model]: { ...sel, saved: true } });
    } catch (e: any) {
      alert(`Could not save: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const itemsA = data?.methodA.outputs[model] ?? [];
  const itemsB = data?.methodB.outputs[model] ?? [];
  const chosenA = useMemo(
    () => itemsA.filter((i) => sel.topA.includes(i.id)),
    [itemsA, sel.topA],
  );
  const chosenB = useMemo(
    () => itemsB.filter((i) => sel.topB.includes(i.id)),
    [itemsB, sel.topB],
  );

  if (gateOpen) {
    return (
      <Shell>
        <div className="glass mx-auto mt-16 max-w-lg rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white">Method comparison</h1>
          <p className="mt-2 text-sm text-slate-400">
            Two ways of squeezing 40 solutions out of a model — 40 principle prompts vs a
            40-round “don’t repeat yourself” chain. Pick the top 5 of each, then compare them
            side by side. Your name is stored with every ballot.
          </p>
          <label className="mt-6 block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Your name (required)</span>
            <input
              value={rater.label}
              onChange={(e) => setRater((r) => ({ ...r, label: e.target.value }))}
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
            Start
          </button>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p className="mt-16 text-center text-slate-400">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Method comparison — haptic Mars boot</h1>
          <p className="text-xs text-slate-500">
            reviewer: <b className="text-slate-300">{rater.label}</b> · case {data.case_id}
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <a href="/review" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">Review tab</a>
          <a href="/api/compare?format=json" className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 hover:bg-white/5">⬇ ballots</a>
        </nav>
      </header>

      <details className="glass mb-4 rounded-xl px-4 py-3 text-sm text-slate-300">
        <summary className="cursor-pointer text-slate-400">Problem statement</summary>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{data.problem}</p>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {data.models.map((m) => (
          <button
            key={m}
            onClick={() => {
              setModel(m);
              setView("rank");
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              model === m
                ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {m} {sels[m]?.saved ? "✓" : ""}
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => setView(view === "rank" ? "compare" : "rank")}
          disabled={view === "rank" && chosenA.length === 0 && chosenB.length === 0}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {view === "rank" ? `Compare top 5s → (${chosenA.length}A / ${chosenB.length}B)` : "← Back to ranking"}
        </button>
      </div>

      {view === "rank" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Column
              title={`A · ${data.methodA.label}`}
              accent="sky"
              items={itemsA}
              picked={sel.topA}
              onToggle={(id) => toggle("topA", id)}
              expanded={expanded}
              setExpanded={setExpanded}
              keyPrefix={`${model}|A`}
            />
            <Column
              title={`B · ${data.methodB.label}`}
              accent="violet"
              items={itemsB}
              picked={sel.topB}
              onToggle={(id) => toggle("topB", id)}
              expanded={expanded}
              setExpanded={setExpanded}
              keyPrefix={`${model}|B`}
            />
          </div>

          <div className="sticky bottom-3 mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0d1a]/95 px-4 py-3 shadow-xl">
            <span className="text-sm text-slate-300">
              A: <b className="text-sky-300">{sel.topA.length}/5</b>{" "}
              <span className="font-mono text-xs">{sel.topA.join(" ")}</span>
            </span>
            <span className="text-sm text-slate-300">
              B: <b className="text-violet-300">{sel.topB.length}/5</b>{" "}
              <span className="font-mono text-xs">{sel.topB.join(" ")}</span>
            </span>
            <span className="flex-1" />
            {sel.saved && <span className="text-xs text-emerald-400">saved ✓</span>}
            <button
              onClick={save}
              disabled={saving || (sel.topA.length === 0 && sel.topB.length === 0)}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Saving…" : sel.saved ? "Re-save ballot" : "Save ballot"}
            </button>
          </div>
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <CompareColumn title={`Top ${chosenA.length} — per-principle`} accent="sky" items={chosenA} order={sel.topA} />
          <CompareColumn title={`Top ${chosenB.length} — iterative chain`} accent="violet" items={chosenB} order={sel.topB} />
        </div>
      )}
    </Shell>
  );
}

function Column({
  title, accent, items, picked, onToggle, expanded, setExpanded, keyPrefix,
}: {
  title: string;
  accent: "sky" | "violet";
  items: Item[];
  picked: string[];
  onToggle: (id: string) => void;
  expanded: Record<string, boolean>;
  setExpanded: (f: (e: Record<string, boolean>) => Record<string, boolean>) => void;
  keyPrefix: string;
}) {
  const ring = accent === "sky" ? "border-sky-400/60 bg-sky-400/10" : "border-violet-400/60 bg-violet-400/10";
  return (
    <section>
      <h2 className={`mb-2 text-sm font-semibold ${accent === "sky" ? "text-sky-300" : "text-violet-300"}`}>{title}</h2>
      <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1 scroll-soft">
        {items.map((it) => {
          const starred = picked.includes(it.id);
          const ek = `${keyPrefix}|${it.id}`;
          const open = expanded[ek];
          return (
            <div key={it.id} className={`rounded-xl border p-3 ${starred ? ring : "border-white/10 bg-white/[0.03]"}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  <span className="font-mono text-slate-400">{it.id}</span> {it.title.replace(it.id, "").trim()}
                  <span className="ml-2 text-[10px] text-slate-500">{it.words}w</span>
                </span>
                <span className="flex items-center gap-1">
                  {starred && (
                    <span className="rounded bg-white/10 px-1.5 text-[10px] text-slate-300">
                      #{picked.indexOf(it.id) + 1}
                    </span>
                  )}
                  <button
                    onClick={() => onToggle(it.id)}
                    className={`rounded-md px-2 py-1 text-base leading-none ${starred ? "bg-yellow-400/25" : "bg-white/5 hover:bg-white/10"}`}
                  >
                    {starred ? "★" : "☆"}
                  </button>
                </span>
              </div>
              <p className={`whitespace-pre-wrap text-[13px] leading-relaxed text-slate-400 ${open ? "" : "line-clamp-3"}`}>
                {it.text}
              </p>
              <button
                onClick={() => setExpanded((e) => ({ ...e, [ek]: !e[ek] }))}
                className="mt-1 text-[11px] text-sky-400 hover:underline"
              >
                {open ? "collapse ▴" : "read full ▾"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CompareColumn({
  title, accent, items, order,
}: {
  title: string;
  accent: "sky" | "violet";
  items: Item[];
  order: string[];
}) {
  const sorted = [...items].sort((a, z) => order.indexOf(a.id) - order.indexOf(z.id));
  return (
    <section>
      <h2 className={`mb-2 text-sm font-semibold ${accent === "sky" ? "text-sky-300" : "text-violet-300"}`}>{title}</h2>
      <div className="space-y-3">
        {sorted.map((it, i) => (
          <div key={it.id} className="glass rounded-xl p-4">
            <div className="mb-1.5 text-xs font-semibold text-slate-200">
              <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">#{i + 1}</span>
              <span className="font-mono text-slate-400">{it.id}</span> {it.title.replace(it.id, "").trim()}
              <span className="ml-2 text-[10px] text-slate-500">{it.words}w</span>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300">{it.text}</p>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-xs text-slate-500">nothing selected on this side yet</p>}
      </div>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">{children}</div>
    </main>
  );
}
