import { ClaimIssue } from "@/lib/types";
type Severity = "critical" | "high" | "medium" | "low";

interface Props {
  issues: ClaimIssue[];
}

const SEVERITY_CONFIG: Record<Severity, { badge: string; dot: string; order: number }> = {
  critical: { badge: "bg-red-100 text-red-700 border border-red-200",    dot: "bg-red-500",    order: 0 },
  high:     { badge: "bg-orange-100 text-orange-700 border border-orange-200", dot: "bg-orange-500", order: 1 },
  medium:   { badge: "bg-amber-100 text-amber-700 border border-amber-200",  dot: "bg-amber-500",  order: 2 },
  low:      { badge: "bg-slate-100 text-slate-600 border border-slate-200",  dot: "bg-slate-400",  order: 3 },
};

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding",
  modifier: "Modifier",
  documentation: "Documentation",
  eligibility: "Eligibility",
  payer_rule: "Payer Rule",
  administrative: "Administrative",
};

export default function IssuesList({ issues }: Props) {
  const sorted = [...issues].sort((a, b) => {
    const ao = SEVERITY_CONFIG[a.severity]?.order ?? 9;
    const bo = SEVERITY_CONFIG[b.severity]?.order ?? 9;
    return ao - bo;
  });

  if (sorted.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-700">
        No issues detected. This claim appears ready for submission.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((issue, i) => {
        const sev = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.low;
        return (
          <div key={issue.id || i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${sev.dot}`} />
                <p className="font-medium text-slate-800 text-sm">{issue.title}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.badge}`}>
                  {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {CATEGORY_LABELS[issue.category] || issue.category}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed pl-4.5">{issue.description}</p>

            <div className="flex items-center gap-4 pl-4.5 text-xs text-slate-400">
              {issue.code_reference && (
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  {issue.code_reference}
                </span>
              )}
              {issue.denial_likelihood && (
                <span>Denial likelihood: <span className="text-slate-600 font-medium">{issue.denial_likelihood}</span></span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
