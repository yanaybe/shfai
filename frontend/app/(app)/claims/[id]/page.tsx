"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getClaim, reanalyzeClaim, getClaimStatus } from "@/lib/api";
import { Claim } from "@/lib/types";
import RiskGauge from "@/components/results/RiskGauge";
import IssuesList from "@/components/results/IssuesList";
import SuggestedFixes from "@/components/results/SuggestedFixes";
import ClaimDataView from "@/components/results/ClaimDataView";
import SubmissionSummary from "@/components/results/SubmissionSummary";

const STATUS_BADGE: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-600",
  processing: "bg-blue-50 text-blue-700",
  analyzed: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
};

type Tab = "summary" | "issues" | "fixes" | "data";

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");

  const load = async () => {
    try { setClaim(await getClaim(id)); }
    finally { setLoading(false); }
  };

  const pollStatus = async () => {
    const deadline = Date.now() + 120000;
    const check = async () => {
      const s = await getClaimStatus(id);
      if (s.status === "analyzed" || s.status === "needs_review" || s.status === "approved") {
        await load(); setReanalyzing(false);
      } else if (Date.now() < deadline) setTimeout(check, 2500);
      else setReanalyzing(false);
    };
    check();
  };

  useEffect(() => { load(); }, [id]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    await reanalyzeClaim(id);
    pollStatus();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!claim) return (
    <div className="max-w-xl space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">Claim not found.</div>
      <Link href="/claims" className="text-sm text-blue-600 hover:underline">← Back to claims</Link>
    </div>
  );

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "summary", label: "Summary" },
    { key: "issues", label: "Issues", count: claim.issues.length },
    { key: "fixes", label: "Fixes", count: claim.fixes.length },
    { key: "data", label: "Extracted Data" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/claims" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            All claims
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{claim.file_name || "Claim"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[claim.status] || "bg-slate-100 text-slate-600"}`}>
              {claim.status.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {claim.uploaded_by && ` · ${claim.uploaded_by.full_name}`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/claims/${id}/edit`}
            className="text-sm font-medium border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            Edit Data
          </Link>
          <button onClick={handleReanalyze} disabled={reanalyzing}
            className="text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {reanalyzing ? "Analyzing..." : "Re-run Analysis"}
          </button>
        </div>
      </div>

      {claim.risk_score !== null && claim.risk_level && (
        <RiskGauge score={claim.risk_score} level={claim.risk_level as "low" | "medium" | "high"} />
      )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
            {count !== undefined && count > 0 && (
              <span className="text-xs rounded-full w-4 h-4 flex items-center justify-center bg-slate-100 text-slate-600">{count}</span>
            )}
          </button>
        ))}
      </div>

      <div>
        {tab === "summary" && claim.report && <SubmissionSummary report={claim.report} />}
        {tab === "issues" && <IssuesList issues={claim.issues} />}
        {tab === "fixes" && <SuggestedFixes fixes={claim.fixes} />}
        {tab === "data" && claim.extracted_data && (
          <ClaimDataView data={claim.extracted_data as Record<string, unknown>} fileName={claim.file_name} />
        )}
      </div>
    </div>
  );
}
