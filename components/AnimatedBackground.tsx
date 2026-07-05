export default function AnimatedBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="blob"
        style={{ background: "#3b82f6", width: 520, height: 520, top: -140, left: -100, animation: "float1 16s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ background: "#a855f7", width: 560, height: 560, bottom: -180, right: -120, animation: "float2 20s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ background: "#06b6d4", width: 420, height: 420, top: "45%", left: "52%", animation: "float3 24s ease-in-out infinite" }}
      />
      <div className="fixed inset-0 bg-[#070810]/70" />
      <div
        className="fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}
