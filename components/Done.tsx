"use client";
import { motion } from "framer-motion";

export default function Done({
  total,
  trizPicks,
  onRestart,
}: {
  total: number;
  trizPicks: number;
  onRestart: () => void;
}) {
  const pct = total ? Math.round((trizPicks / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="glass mx-auto max-w-xl rounded-3xl p-8 text-center sm:p-10"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 text-3xl"
      >
        ✓
      </motion.div>
      <h2 className="text-3xl font-extrabold tracking-tight">Thank you!</h2>
      <p className="mt-3 text-slate-300">
        You evaluated <b className="text-white">{total}</b> comparisons. Your responses are saved.
      </p>

      <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm text-slate-400">The reveal</div>
        <div className="mt-1 text-2xl font-bold text-white">
          You preferred the <span className="text-sky-300">TRIZ-guided</span> solution
        </div>
        <div className="my-3 text-5xl font-extrabold text-transparent bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text">
          {pct}%
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
          />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          50% would mean no preference between the two approaches.
        </div>
      </div>

      <button
        onClick={onRestart}
        className="mt-7 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        Play again
      </button>
    </motion.div>
  );
}
