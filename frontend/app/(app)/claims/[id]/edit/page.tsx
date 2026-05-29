"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getClaim, editClaim } from "@/lib/api";

type ExtractedData = Record<string, string | string[] | null | undefined>;

const ARRAY_FIELDS = ["icd10_codes", "cpt_codes", "modifiers", "service_dates"];
const FIELD_LABELS: Record<string, string> = {
  payer: "Payer Name", payer_id: "Payer ID", patient_age: "Patient Age",
  patient_gender: "Patient Gender", place_of_service: "Place of Service",
  provider_type: "Provider Type", billing_provider_npi: "Billing Provider NPI",
  rendering_provider_npi: "Rendering Provider NPI", total_charge: "Total Charge",
  claim_type: "Claim Type", notes: "Notes",
};

export default function EditClaimPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ExtractedData>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getClaim(id).then(c => setData((c.extracted_data || {}) as ExtractedData));
  }, [id]);

  const setField = (key: string, val: string) =>
    setData(d => ({ ...d, [key]: val }));

  const setArrayField = (key: string, val: string) =>
    setData(d => ({ ...d, [key]: val.split(",").map(v => v.trim()).filter(Boolean) }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await editClaim(id, { extracted_data: data as Record<string, unknown> });
      router.push(`/claims/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/claims/${id}`} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          Back to claim
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Edit Extracted Data</h1>
        <p className="text-sm text-slate-500 mt-1">Correct any extraction errors before re-running analysis.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Coding</p>
          {ARRAY_FIELDS.map(key => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{key.replace("_", " ")}</label>
              <input
                value={Array.isArray(data[key]) ? (data[key] as string[]).join(", ") : (data[key] as string) || ""}
                onChange={e => setArrayField(key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Comma-separated codes, e.g. 99213, 99214"
              />
              <p className="text-xs text-slate-400 mt-0.5">Separate multiple codes with commas</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Claim Details</p>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  value={(data[key] as string) || ""}
                  onChange={e => setField(key, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <Link href={`/claims/${id}`} className="text-sm font-medium text-slate-600 border border-slate-200 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </Link>
      </div>
    </div>
  );
}
