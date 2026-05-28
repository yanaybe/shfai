import { RiskLevel } from "@/lib/types";

interface Props {
  score: number;
  level: RiskLevel;
}

const CONFIG: Record<RiskLevel, { color: string; ring: string; bg: string; label: string }> = {
  low:    { color: "text-emerald-700", ring: "stroke-emerald-500", bg: "bg-emerald-50 border-emerald-200", label: "Low Risk" },
  medium: { color: "text-amber-700",   ring: "stroke-amber-500",   bg: "bg-amber-50 border-amber-200",     label: "Medium Risk" },
  high:   { color: "text-red-700",     ring: "stroke-red-500",     bg: "bg-red-50 border-red-200",         label: "High Risk" },
};

export default function RiskGauge({ score, level }: Props) {
  const c = CONFIG[level];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`border rounded-xl p-6 flex items-center gap-6 ${c.bg}`}>
      {/* Circular gauge */}
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" className="stroke-slate-200" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            className={c.ring}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${c.color}`}>{score}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>

      {/* Label */}
      <div>
        <p className={`text-xl font-semibold ${c.color}`}>{c.label}</p>
        <p className="text-sm text-slate-600 mt-1">Estimated denial probability</p>
        <div className="mt-3 text-xs text-slate-500 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />0–25 Low
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />26–55 Medium
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />56–100 High
          </div>
        </div>
      </div>
    </div>
  );
}
