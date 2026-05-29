"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listClaims, deleteClaim } from "@/lib/api";
import { ClaimListItem } from "@/lib/types";
import { useAuth } from "@/lib/auth";

const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  high: "bg-red-50 text-red-700 border border-red-200",
};
const STATUS_BADGE: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-600",
  processing: "bg-blue-50 text-blue-700",
  analyzed: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "", risk_level: "", payer: "" });
  const [loading, setLoading] = useState(true);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const r = await listClaims({ page: p, page_size: 20, ...filters });
      setClaims(r.items); setTotal(r.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [filters]);
  useEffect(() => { load(page); }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this claim?")) return;
    await deleteClaim(id);
    load();
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Claims</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total claims</p>
        </div>
        <Link href="/upload" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Upload Claim
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: "status", options: ["", "uploaded", "processing", "analyzed", "needs_review", "approved"], label: "Status" },
          { key: "risk_level", options: ["", "low", "medium", "high"], label: "Risk" },
        ].map(({ key, options, label }) => (
          <select key={key} value={filters[key as keyof typeof filters]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{label}: All</option>
            {options.filter(Boolean).map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
          </select>
        ))}
        <input placeholder="Filter by payer..."
          value={filters.payer} onChange={e => setFilters(f => ({ ...f, payer: e.target.value }))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["File", "Payer", "Status", "Risk Score", "Uploaded By", "Date", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">Loading...</td></tr>
            ) : claims.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No claims found.</td></tr>
            ) : claims.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/claims/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600 truncate max-w-[200px] block">
                    {c.file_name || "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.payer || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] || "bg-slate-100 text-slate-600"}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.risk_score !== null && c.risk_level ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RISK_BADGE[c.risk_level]}`}>
                      {c.risk_score} · {c.risk_level}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.uploaded_by?.full_name || "—"}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/claims/${c.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                    {(user?.role === "admin" || user?.role === "owner") && (
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page} of {Math.ceil(total / 20)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
