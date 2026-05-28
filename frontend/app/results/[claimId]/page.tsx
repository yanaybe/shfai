"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getClaim } from "@/lib/api";
import { Claim } from "@/lib/types";
import RiskGauge from "@/components/results/RiskGauge";
import IssuesList from "@/components/results/IssuesList";
import SuggestedFixes from "@/components/results/SuggestedFixes";
import ClaimDataView from "@/components/results/ClaimDataView";
import SubmissionSummary from "@/components/results/SubmissionSummary";

type Section = "summary" | "issues" | "fixes" | "data";

export default function ResultsPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("summary");

  useEffect(() => {
    getClaim(claimId)
      .then(setClaim)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [claimId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="font-medium text-red-700">Unable to load results</p>
          <p className="text-sm text-red-600 mt-1">{error || "Claim not found."}</p>
        </div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to upload</Link>
      </div>
    );
  }

  if (claim.status === "failed") {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="font-medium text-red-700">Processing failed</p>
          <p className="text-sm text-red-600 mt-1">{claim.processing_error || "An error occurred during analysis."}</p>
        </div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Try again</Link>
      </div>
    );
  }

  const criticalCount = claim.issues.filter((i) => i.severity === "critical").length;
  const highCount = claim.issues.filter((i) => i.severity === "high").length;

  const navItems: { key: Section; label: string; count?: number }[] = [
    { key: "summary", label: "Summary" },
    { key: "issues", label: "Issues", count: claim.issues.length },
    { key: "fixes", label: "Fixes", count: claim.fixes.length },
    { key: "data", label: "Extracted Data" },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            New analysis
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            {claim.file_name || "Claim Analysis"}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date(claim.created_at).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </p>
        </div>

        {/* Issue count chips */}
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs font-medium bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">
              {highCount} high
            </span>
          )}
        </div>
      </div>

      {/* Risk gauge */}
      {claim.risk_score !== null && claim.risk_level && (
        <RiskGauge score={claim.risk_score} level={claim.risk_level} />
      )}

      {/* Nav tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {navItems.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={[
              "flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5",
              activeSection === key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={[
                "text-xs rounded-full w-4 h-4 flex items-center justify-center",
                activeSection === key ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500",
              ].join(" ")}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div>
        {activeSection === "summary" && claim.report && (
          <SubmissionSummary report={claim.report} />
        )}
        {activeSection === "issues" && (
          <IssuesList issues={claim.issues} />
        )}
        {activeSection === "fixes" && (
          <SuggestedFixes fixes={claim.fixes} />
        )}
        {activeSection === "data" && claim.extracted_data && (
          <ClaimDataView data={claim.extracted_data} fileName={claim.file_name} />
        )}
      </div>
    </div>
  );
}
