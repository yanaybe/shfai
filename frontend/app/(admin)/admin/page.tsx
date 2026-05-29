"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlatformStats } from "@/lib/api";
import { PlatformStats } from "@/lib/types";

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => { getPlatformStats().then(setStats).catch(() => {}); }, []);

  const cards = stats ? [
    { label: "Organizations", value: stats.total_organizations, href: "/admin/organizations" },
    { label: "Users", value: stats.total_users, href: "/admin/users" },
    { label: "Total Claims", value: stats.total_claims, href: "/admin/claims" },
    { label: "This Week", value: stats.claims_this_week, href: "/admin/claims" },
    { label: "High Risk Claims", value: stats.high_risk_claims, accent: "text-red-600", href: "/admin/claims" },
    { label: "Avg Risk Score", value: stats.avg_risk_score.toFixed(1), accent: stats.avg_risk_score > 55 ? "text-red-600" : stats.avg_risk_score > 25 ? "text-amber-600" : "text-emerald-600", href: "/admin/claims" },
  ] : [];

  return (
    <div className="space-y-7 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform-wide analytics and management</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats === null ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-20 animate-pulse" />
          ))
        ) : cards.map(({ label, value, accent, href }) => (
          <Link key={label} href={href}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors block">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${accent || "text-slate-900"}`}>{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { href: "/admin/users", label: "Manage Users", desc: "View, deactivate, manage roles" },
          { href: "/admin/organizations", label: "Organizations", desc: "View all orgs, manage subscriptions" },
          { href: "/admin/claims", label: "All Claims", desc: "Platform-wide claim oversight" },
        ].map(({ href, label, desc }) => (
          <Link key={href} href={href}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all block space-y-1">
            <p className="font-semibold text-slate-800 text-sm">{label}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
