"use client";
import { useEffect, useState } from "react";
import { adminListUsers, deactivateUser } from "@/lib/api";
import { AdminUser } from "@/lib/types";

function RoleBadge({ role }: { role: string }) {
  const color = role === "admin" ? "bg-purple-100 text-purple-700" : role === "owner" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${color}`}>{role}</span>;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = (p: number) => {
    setLoading(true);
    adminListUsers(p).then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this user? They will lose access immediately.")) return;
    setDeactivating(id);
    try {
      await deactivateUser(id);
      setUsers(u => u.map(x => x.id === id ? { ...x, is_active: false } : x));
    } finally { setDeactivating(null); }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">All platform users across organizations</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Claims</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-full" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{u.full_name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.organization_name || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{u.claim_count}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(u.last_login_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.is_active && u.role !== "admin" && (
                    <button
                      onClick={() => handleDeactivate(u.id)}
                      disabled={deactivating === u.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
                    >
                      {deactivating === u.id ? "..." : "Deactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>{filtered.length} users shown</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">Previous</button>
          <span className="px-3 py-1.5 text-slate-600 font-medium">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={users.length < 50}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
