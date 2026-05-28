import { Claim, ClaimStatusResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function uploadClaim(file: File): Promise<ClaimStatusResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/claims/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function getClaimStatus(claimId: string): Promise<ClaimStatusResponse> {
  const res = await fetch(`${BASE}/claims/${claimId}/status`);
  if (!res.ok) throw new Error("Failed to fetch claim status");
  return res.json();
}

export async function getClaim(claimId: string): Promise<Claim> {
  const res = await fetch(`${BASE}/claims/${claimId}`);
  if (!res.ok) throw new Error("Failed to fetch claim");
  return res.json();
}

export async function pollUntilComplete(
  claimId: string,
  onProgress?: (status: string) => void,
  intervalMs = 2000,
  maxWaitMs = 120000
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const s = await getClaimStatus(claimId);
        onProgress?.(s.status);
        if (s.status === "completed" || s.status === "failed") {
          resolve();
        } else if (Date.now() > deadline) {
          reject(new Error("Processing timed out. Please try again."));
        } else {
          setTimeout(check, intervalMs);
        }
      } catch (e) {
        reject(e);
      }
    };
    check();
  });
}
