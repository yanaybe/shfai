import { Claim, ClaimListResponse, PlatformStats, AdminUser, AdminOrg, AdminClaim } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signup(data: { full_name: string; email: string; password: string; organization_name: string }) {
  const r = await request<{ access_token: string; refresh_token: string }>("/auth/signup", {
    method: "POST", body: JSON.stringify(data),
  });
  localStorage.setItem("access_token", r.access_token);
  localStorage.setItem("refresh_token", r.refresh_token);
  return r;
}

export async function login(email: string, password: string) {
  const r = await request<{ access_token: string; refresh_token: string }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("access_token", r.access_token);
  localStorage.setItem("refresh_token", r.refresh_token);
  return r;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export async function getMe() {
  return request<{ id: string; email: string; full_name: string; role: string; organization_id: string | null; organization_name: string | null }>("/auth/me");
}

// ── Claims ────────────────────────────────────────────────────────────────────
export async function uploadClaim(file: File): Promise<{ id: string; status: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/claims/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function listClaims(params?: { page?: number; page_size?: number; status?: string; risk_level?: string; payer?: string }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  if (params?.status) q.set("status", params.status);
  if (params?.risk_level) q.set("risk_level", params.risk_level);
  if (params?.payer) q.set("payer", params.payer);
  return request<ClaimListResponse>(`/claims?${q}`);
}

export async function getClaim(id: string) {
  return request<Claim>(`/claims/${id}`);
}

export async function getClaimStatus(id: string) {
  return request<{ id: string; status: string; risk_score: number | null; risk_level: string | null }>(`/claims/${id}/status`);
}

export async function editClaim(id: string, data: { extracted_data: Record<string, unknown>; status?: string }) {
  return request<{ id: string; status: string }>(`/claims/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function reanalyzeClaim(id: string) {
  return request<{ id: string; status: string }>(`/claims/${id}/reanalyze`, { method: "POST" });
}

export async function deleteClaim(id: string) {
  return request<null>(`/claims/${id}`, { method: "DELETE" });
}

export async function pollUntilComplete(claimId: string, onStatus?: (s: string) => void, intervalMs = 2000, maxMs = 120000) {
  const deadline = Date.now() + maxMs;
  return new Promise<void>((resolve, reject) => {
    const check = async () => {
      try {
        const s = await getClaimStatus(claimId);
        onStatus?.(s.status);
        if (s.status === "analyzed" || s.status === "needs_review" || s.status === "approved") resolve();
        else if (Date.now() > deadline) reject(new Error("Processing timed out."));
        else setTimeout(check, intervalMs);
      } catch (e) { reject(e); }
    };
    check();
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function getPlatformStats() {
  return request<PlatformStats>("/admin/stats");
}

export async function adminListUsers(page = 1) {
  return request<AdminUser[]>(`/admin/users?page=${page}`);
}

export async function adminListOrgs(page = 1) {
  return request<AdminOrg[]>(`/admin/organizations?page=${page}`);
}

export async function adminListClaims(page = 1) {
  return request<{ total: number; items: AdminClaim[] }>(`/admin/claims?page=${page}`);
}

export async function adminDeleteClaim(id: string) {
  return request<null>(`/admin/claims/${id}`, { method: "DELETE" });
}

export async function deactivateUser(id: string) {
  return request<{ status: string }>(`/admin/users/${id}/deactivate`, { method: "PATCH", body: JSON.stringify({}) });
}

export async function deactivateOrg(id: string) {
  return request<{ status: string }>(`/admin/organizations/${id}/deactivate`, { method: "PATCH", body: JSON.stringify({}) });
}
