"use client";
import { useEffect, useState } from "react";
import { adminListOrgs, deactivateOrg } from "@/lib/api";
import { AdminOrg } from "@/lib/types";

function PlanBadge({ plan }: { plan: string }) {
  const color = plan === "enterprise" ? "bg-purple-100 text-purple-700" : plan === "pro" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${color}`}>{plan}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "active" ? "bg-emerald-100 text-emerald-700" : status === "trial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${color}`}>{status}</span>;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = (p: number) => {
    setLoading(true);
    adminListOrgs(p).then(setOrgs).finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? All users in this org will lose access.`)) return;
    setDeactivating(id);
    try {
      await deactivateOrg(id);
      setOrgs(o => o.map(x => x.id === id ? { ...x, is_active: false } : x));
    } finally { setDeactivating(null); }
  };

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500 mt-0.5">All organizations on the platform</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or slug..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sub Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Users</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Claims</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-full" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">No organizations found</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{o.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{o.slug}</p>
                </td>
                <td className="px-4 py-3"><PlanBadge plan={o.subscription_plan} /></td>
                <td className="px-4 py-3"><StatusBadge status={o.subscription_status} /></td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{o.user_count}</td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{o.claim_count}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${o.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {o.is_active ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {o.is_active && (
                    <button
                      onClick={() => handleDeactivate(o.id, o.name)}
                      disabled={deactivating === o.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
                    >
                      {deactivating === o.id ? "..." : "Deactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>{filtered.length} organizations shown</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">Previous</button>
          <span className="px-3 py-1.5 text-slate-600 font-medium">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={orgs.length < 50}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
