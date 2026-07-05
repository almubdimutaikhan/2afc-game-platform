"use client";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import Landing from "@/components/Landing";
import Round from "@/components/Round";
import Done from "@/components/Done";
import Progress from "@/components/Progress";
import type { ClientRound } from "@/lib/types";

const N = Number(process.env.NEXT_PUBLIC_SESSION_LENGTH || 20);

type Phase = "landing" | "play" | "done";

export default function Page() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState<ClientRound[]>([]);
  const [idx, setIdx] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [rater, setRater] = useState({ label: "", expertise: "" });
  const [trizPicks, setTrizPicks] = useState(0);

  const start = useCallback(async (r: { label: string; expertise: string }) => {
    setRater(r);
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n: N }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setRounds(data.rounds);
      setIdx(0);
      setTrizPicks(0);
      setPhase("play");
    } catch {
      alert("Could not start the session. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const choose = useCallback(
    async (side: "left" | "right", timeMs: number) => {
      const round = rounds[idx];
      const last = idx + 1 >= rounds.length;

      // advance UI immediately; record in the background
      if (last) setPhase("done");
      else setIdx((i) => i + 1);

      try {
        const res = await fetch("/api/responses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            token: round.token,
            chosenSide: side,
            timeMs,
            raterLabel: rater.label || undefined,
            expertise: rater.expertise || undefined,
          }),
        });
        const data = await res.json();
        if (data?.chosenArm === "triz") setTrizPicks((t) => t + 1);
      } catch {
        /* keep the session flowing even if a write fails */
      }
    },
    [idx, rounds, sessionId, rater],
  );

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:py-10">
        {phase === "play" && (
          <div className="mb-6">
            <Progress current={idx} total={rounds.length || N} />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            {phase === "landing" && (
              <Landing key="landing" total={N} onStart={start} loading={loading} />
            )}
            {phase === "play" && rounds[idx] && (
              <Round key={rounds[idx].token} round={rounds[idx]} index={idx} onChoose={choose} />
            )}
            {phase === "done" && (
              <Done
                key="done"
                total={rounds.length}
                trizPicks={trizPicks}
                onRestart={() => setPhase("landing")}
              />
            )}
          </AnimatePresence>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center text-xs text-slate-600"
        >
          TRIZ Arena · blind two-alternative forced-choice evaluation
        </motion.footer>
      </div>
    </main>
  );
}
