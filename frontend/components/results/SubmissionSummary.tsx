import { ClaimReport } from "@/lib/types";

interface Props {
  report: ClaimReport;
}

const READINESS = {
  "Ready": {
    bg: "bg-emerald-50 border-emerald-200",
    icon: "text-emerald-600",
    title: "Ready for Submission",
    desc: "No blocking issues detected. Review suggested fixes before submitting.",
  },
  "Needs Review": {
    bg: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    title: "Needs Review Before Submission",
    desc: "Issues identified that should be resolved to reduce denial risk.",
  },
  "Not Ready": {
    bg: "bg-red-50 border-red-200",
    icon: "text-red-600",
    title: "Not Ready — Corrections Required",
    desc: "Critical issues detected. Submission without correction is likely to result in denial.",
  },
};

export default function SubmissionSummary({ report }: Props) {
  const key = (report.submission_readiness || "Needs Review") as keyof typeof READINESS;
  const config = READINESS[key] ?? READINESS["Needs Review"];

  return (
    <div className="space-y-4">
      {/* Readiness banner */}
      <div className={`border rounded-xl p-5 ${config.bg}`}>
        <div className="flex items-start gap-3">
          <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {key === "Ready" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            )}
          </svg>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{config.title}</p>
            <p className="text-sm text-slate-600 mt-0.5">{config.desc}</p>
          </div>
        </div>
      </div>

      {/* Executive summary */}
      {report.executive_summary && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Executive Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed">{report.executive_summary}</p>
        </div>
      )}

      {/* Payer simulation */}
      {report.payer_adjudication_simulation && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Payer Adjudication Simulation</p>
          <p className="text-sm text-slate-600 leading-relaxed italic">{report.payer_adjudication_simulation}</p>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        {report.ai_confidence && <span>AI confidence: <span className="text-slate-600 font-medium">{report.ai_confidence}</span></span>}
        {report.processing_time_ms && <span>Processed in {(report.processing_time_ms / 1000).toFixed(1)}s</span>}
      </div>
    </div>
  );
}
