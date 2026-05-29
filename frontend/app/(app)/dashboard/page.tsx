"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listClaims } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ClaimListItem } from "@/lib/types";

const RISK_COLOR = { low: "text-emerald-700 bg-emerald-50", medium: "text-amber-700 bg-amber-50", high: "text-red-700 bg-red-50" };
const STATUS_COLOR: Record<string, string> = {
  uploaded: "text-slate-600 bg-slate-100",
  processing: "text-blue-700 bg-blue-50",
  analyzed: "text-emerald-700 bg-emerald-50",
  needs_review: "text-amber-700 bg-amber-50",
  approved: "text-green-700 bg-green-50",
};

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    listClaims({ page: 1, page_size: 50 }).then(r => { setClaims(r.items); setTotal(r.total); }).catch(() => {});
  }, []);

  const highRisk = claims.filter(c => c.risk_level === "high").length;
  const analyzed = claims.filter(c => c.risk_score !== null);
  const avgScore = analyzed.length ? Math.round(analyzed.reduce((s, c) => s + (c.risk_score || 0), 0) / analyzed.length) : 0;
  const thisWeek = claims.filter(c => new Date(c.created_at) > new Date(Date.now() - 7 * 864e5)).length;

  return (
    <div className="space-y-7 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">{user?.organization_name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Claims" value={total} sub="all time" />
        <MetricCard label="High Risk" value={highRisk} sub="require review" accent="text-red-600" />
        <MetricCard label="Avg Risk Score" value={avgScore} sub="across analyzed" accent={avgScore > 55 ? "text-red-600" : avgScore > 25 ? "text-amber-600" : "text-emerald-600"} />
        <MetricCard label="This Week" value={thisWeek} sub="new uploads" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Recent Claims</h2>
          <Link href="/claims" className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        {claims.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">No claims yet.</p>
            <Link href="/upload" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Upload your first claim →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {claims.slice(0, 8).map(c => (
              <Link key={c.id} href={`/claims/${c.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.file_name || "Unnamed claim"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.payer || "Unknown payer"} · {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                {c.risk_score !== null && c.risk_level && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RISK_COLOR[c.risk_level]}`}>
                    {c.risk_score}
                  </span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status] || "bg-slate-100 text-slate-600"}`}>
                  {c.status.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
