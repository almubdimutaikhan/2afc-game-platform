// SERVER-ONLY. Never import this from a client component — it contains the
// triz/control mapping that must not reach the browser.
import data from "@/data/pairs.json";
import type { Pair, Round } from "./types";

export const PAIRS: Pair[] = (data as { pairs: Pair[] }).pairs;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a balanced session of `n` rounds:
 *  - spreads across cases (round-robin) before repeating a case for another model,
 *  - randomizes which side (left/right) the TRIZ solution appears on.
 */
export function buildSession(n: number): Round[] {
  const byCase = new Map<string, Pair[]>();
  for (const p of PAIRS) {
    if (!byCase.has(p.case_id)) byCase.set(p.case_id, []);
    byCase.get(p.case_id)!.push(p);
  }
  const queues = shuffle([...byCase.values()].map((ps) => shuffle(ps)));

  const picked: Pair[] = [];
  let progress = true;
  while (picked.length < n && progress) {
    progress = false;
    for (const q of queues) {
      if (q.length) {
        picked.push(q.shift()!);
        progress = true;
        if (picked.length >= n) break;
      }
    }
  }

  return picked.map((p) => {
    const trizSide: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
    return {
      pairId: p.id,
      caseId: p.case_id,
      model: p.model,
      problem: p.problem,
      left: trizSide === "left" ? p.triz : p.control,
      right: trizSide === "left" ? p.control : p.triz,
      trizSide,
    };
  });
}
