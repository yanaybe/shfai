"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", organization_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signup(form);
      await refresh();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Create your account</h1>
      <p className="text-sm text-slate-500 mb-6">Start analyzing claims in minutes</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "organization_name", label: "Organization name", placeholder: "Riverside Family Medicine", type: "text" },
          { key: "full_name", label: "Your full name", placeholder: "Dr. Sarah Chen", type: "text" },
          { key: "email", label: "Work email", placeholder: "you@clinic.com", type: "email" },
          { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input type={type} required value={form[key as keyof typeof form]}
              onChange={set(key as keyof typeof form)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={placeholder} />
          </div>
        ))}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
