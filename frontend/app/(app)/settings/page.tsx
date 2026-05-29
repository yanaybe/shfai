"use client";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-400 text-xs mb-0.5">Name</p><p className="font-medium text-slate-800">{user?.full_name}</p></div>
          <div><p className="text-slate-400 text-xs mb-0.5">Email</p><p className="font-medium text-slate-800">{user?.email}</p></div>
          <div><p className="text-slate-400 text-xs mb-0.5">Role</p><p className="font-medium text-slate-800 capitalize">{user?.role}</p></div>
          <div><p className="text-slate-400 text-xs mb-0.5">Organization</p><p className="font-medium text-slate-800">{user?.organization_name}</p></div>
        </div>
      </div>
    </div>
  );
}
