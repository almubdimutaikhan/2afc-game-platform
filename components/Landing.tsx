"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const EXPERTISE = [
  "",
  "No engineering background",
  "Student / hobbyist",
  "Practicing engineer",
  "TRIZ-familiar",
  "TRIZ expert",
];

export default function Landing({
  total,
  onStart,
  loading,
}: {
  total: number;
  onStart: (r: { label: string; expertise: string }) => void;
  loading: boolean;
}) {
  const [label, setLabel] = useState("");
  const [expertise, setExpertise] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4 }}
      className="glass mx-auto max-w-2xl rounded-3xl p-8 sm:p-10"
    >
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> blind 2AFC evaluation
      </div>
      <h1 className="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
        TRIZ Arena
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-300">
        You&apos;ll see an engineering problem and <b className="text-white">two AI-written solutions</b>.
        Pick the one you think solves it better. That&apos;s it. You won&apos;t be told which approach
        produced which answer.
      </p>
      <ul className="mt-5 space-y-2 text-sm text-slate-400">
        <li>• {total} quick comparisons — about 5 minutes</li>
        <li>• Click a card, or press <kbd>1</kbd>/<kbd>2</kbd> (or <kbd>←</kbd>/<kbd>→</kbd>)</li>
        <li>• There are no right answers — go with your judgment</li>
      </ul>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Name or handle (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="anonymous"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-sky-400/60 focus:bg-white/10"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Your background (optional)</span>
          <select
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-sky-400/60 focus:bg-white/10"
          >
            {EXPERTISE.map((e) => (
              <option key={e} value={e} className="bg-slate-900">
                {e || "Prefer not to say"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        disabled={loading}
        onClick={() => onStart({ label: label.trim(), expertise })}
        className="group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Preparing…" : "Start evaluating"}
        {!loading && <span className="transition group-hover:translate-x-0.5">→</span>}
      </button>
      <p className="mt-4 text-center text-xs text-slate-500">
        Anonymous responses are stored for research analysis.
      </p>
      <p className="mt-2 text-center text-xs text-slate-600">
        Research team:{" "}
        <a href="/review" className="underline hover:text-slate-400">
          per-principle output review →
        </a>
      </p>
    </motion.div>
  );
}
