export default function Progress({ current, total }: { current: number; total: number }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-400">
        <span>
          Comparison {Math.min(current + 1, total)} <span className="text-slate-600">/ {total}</span>
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
