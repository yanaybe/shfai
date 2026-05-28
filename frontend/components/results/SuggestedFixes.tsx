import { ClaimFix } from "@/lib/types";

interface Props {
  fixes: ClaimFix[];
}

export default function SuggestedFixes({ fixes }: Props) {
  const sorted = [...fixes].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-5">
        No corrective actions required.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((fix, i) => (
        <div key={fix.id || i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-800">{fix.action}</p>
              {fix.rationale && (
                <p className="text-sm text-slate-500 leading-relaxed">{fix.rationale}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
