import { ExtractedData } from "@/lib/types";

interface Props {
  data: ExtractedData;
  fileName: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function CodeList({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {codes.map((c) => (
        <span key={c} className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
          {c}
        </span>
      ))}
    </div>
  );
}

export default function ClaimDataView({ data, fileName }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      {fileName && (
        <div className="pb-4 border-b border-slate-100">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Source Document</p>
          <p className="text-sm text-slate-700 mt-0.5 font-mono">{fileName}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Payer" value={data.payer} />
        <Field label="Payer ID" value={data.payer_id} />
        <Field label="Claim Type" value={data.claim_type} />
        <Field label="Patient Age" value={data.patient_age} />
        <Field label="Patient Gender" value={data.patient_gender} />
        <Field label="Place of Service" value={data.place_of_service} />
        <Field label="Provider Type" value={data.provider_type} />
        <Field label="Total Charge" value={data.total_charge ? `$${data.total_charge}` : null} />
        <Field
          label="Service Dates"
          value={data.service_dates?.length ? data.service_dates.join(", ") : null}
        />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        {data.icd10_codes?.length ? (
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1.5">
              ICD-10 Diagnosis Codes
            </dt>
            <CodeList codes={data.icd10_codes} />
          </div>
        ) : null}

        {data.cpt_codes?.length ? (
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1.5">
              CPT / HCPCS Procedure Codes
            </dt>
            <CodeList codes={data.cpt_codes} />
          </div>
        ) : null}

        {data.modifiers?.length ? (
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1.5">
              Modifiers
            </dt>
            <CodeList codes={data.modifiers} />
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Billing Provider NPI" value={
            data.billing_provider_npi
              ? <span className="font-mono">{data.billing_provider_npi}</span>
              : <span className="text-red-500">Not detected</span>
          } />
          <Field label="Rendering Provider NPI" value={
            data.rendering_provider_npi
              ? <span className="font-mono">{data.rendering_provider_npi}</span>
              : <span className="text-amber-500">Not detected</span>
          } />
        </div>
      </div>

      {data.notes && (
        <div className="border-t border-slate-100 pt-4">
          <Field label="Notes" value={
            <span className="text-slate-500 italic">{data.notes}</span>
          } />
        </div>
      )}
    </div>
  );
}
