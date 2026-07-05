"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ClientRound } from "@/lib/types";

function Card({
  side,
  letter,
  text,
  state,
  onPick,
}: {
  side: "left" | "right";
  letter: string;
  text: string;
  state: "idle" | "chosen" | "dimmed";
  onPick: (s: "left" | "right") => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onPick(side)}
      whileHover={state === "idle" ? { y: -4 } : undefined}
      whileTap={state === "idle" ? { scale: 0.99 } : undefined}
      animate={{
        opacity: state === "dimmed" ? 0.4 : 1,
        scale: state === "chosen" ? 1.01 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={[
        "group relative flex h-full flex-col rounded-2xl border p-5 text-left transition-colors",
        state === "chosen"
          ? "border-emerald-400/70 bg-emerald-400/10 shadow-lg shadow-emerald-500/10"
          : "border-white/10 bg-white/[0.035] hover:border-sky-400/50 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold",
            state === "chosen" ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-slate-200",
          ].join(" ")}
        >
          {letter}
        </span>
        <kbd>{side === "left" ? "1" : "2"}</kbd>
      </div>
      <p className="scroll-soft max-h-[46vh] overflow-y-auto whitespace-pre-wrap text-[14.5px] leading-relaxed text-slate-200">
        {text}
      </p>
      <span className="pointer-events-none absolute inset-x-5 bottom-3 text-center text-xs font-medium text-sky-300/0 transition group-hover:text-sky-300/80">
        choose this →
      </span>
    </motion.button>
  );
}

export default function Round({
  round,
  index,
  onChoose,
}: {
  round: ClientRound;
  index: number;
  onChoose: (side: "left" | "right", timeMs: number) => void;
}) {
  const startedAt = useRef(Date.now());
  const locked = useRef(false); // synchronous guard: exactly one choice per round
  const [sel, setSel] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    locked.current = false;
    setSel(null);
  }, [round.token]);

  const pick = useCallback(
    (s: "left" | "right") => {
      if (locked.current) return; // ignore repeats (key-repeat, double events, StrictMode)
      locked.current = true;
      setSel(s);
      const dt = Date.now() - startedAt.current;
      window.setTimeout(() => onChoose(s, dt), 300);
    },
    [onChoose],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "1" || k === "arrowleft" || k === "a") pick("left");
      else if (k === "2" || k === "arrowright" || k === "d" || k === "b") pick("right");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pick]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.28 }}
    >
      <div className="glass mb-5 rounded-2xl p-5">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
          The problem
        </div>
        <p className="text-[15px] leading-relaxed text-slate-100">{round.problem}</p>
      </div>

      <div className="mb-4 text-center text-sm font-medium text-slate-400">
        Which solution better solves the problem?
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          side="left"
          letter="A"
          text={round.left}
          state={sel === null ? "idle" : sel === "left" ? "chosen" : "dimmed"}
          onPick={pick}
        />
        <Card
          side="right"
          letter="B"
          text={round.right}
          state={sel === null ? "idle" : sel === "right" ? "chosen" : "dimmed"}
          onPick={pick}
        />
      </div>
    </motion.div>
  );
}
