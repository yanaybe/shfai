"use client";
import { useEffect, useState } from "react";
import { adminListClaims, adminDeleteClaim } from "@/lib/api";
import { AdminClaim } from "@/lib/types";
import Link from "next/link";

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-500",
  processing: "bg-blue-100 text-blue-600",
  analyzed: "bg-emerald-100 text-emerald-700",
  needs_review: "bg-amber-100 text-amber-700",
  approved: "bg-purple-100 text-purple-700",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = (p: number) => {
    setLoading(true);
    adminListClaims(p).then(r => { setClaims(r.items); setTotal(r.total); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const handleDelete = async (id: string, name: string | null) => {
    if (!confirm(`Permanently delete claim "${name || id}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminDeleteClaim(id);
      setClaims(c => c.filter(x => x.id !== id));
      setTotal(t => t - 1);
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">All Claims</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform-wide claim oversight — {total.toLocaleString()} total</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">File</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Payer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-full" /></td></tr>
              ))
            ) : claims.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">No claims found</td></tr>
            ) : claims.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/claims/${c.id}`} className="font-medium text-blue-600 hover:text-blue-800 max-w-[160px] truncate block">
                    {c.file_name || c.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.organization_name || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-500"}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.risk_level ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${RISK_STYLES[c.risk_level] || "bg-slate-100 text-slate-500"}`}>
                      {c.risk_level}
                    </span>
                  ) : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {c.risk_score != null ? c.risk_score.toFixed(0) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.payer || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3">
                  {c.uploaded_by ? (
                    <div>
                      <p className="text-slate-700">{c.uploaded_by.full_name}</p>
                      <p className="text-xs text-slate-400">{c.uploaded_by.email}</p>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(c.id, c.file_name)}
                    disabled={deleting === c.id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
                  >
                    {deleting === c.id ? "..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>{total.toLocaleString()} total claims</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">Previous</button>
          <span className="px-3 py-1.5 text-slate-600 font-medium">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={claims.length < 50}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
