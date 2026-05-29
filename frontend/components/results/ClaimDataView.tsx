interface ExtractedData {
  payer?: string | null;
  payer_id?: string | null;
  claim_type?: string | null;
  patient_age?: string | null;
  patient_gender?: string | null;
  place_of_service?: string | null;
  provider_type?: string | null;
  total_charge?: string | null;
  service_dates?: string[] | null;
  icd10_codes?: string[] | null;
  cpt_codes?: string[] | null;
  modifiers?: string[] | null;
  billing_provider_npi?: string | null;
  rendering_provider_npi?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

interface Props {
  data: Record<string, unknown>;
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
  const d = data as ExtractedData;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      {fileName && (
        <div className="pb-4 border-b border-slate-100">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Source Document</p>
          <p className="text-sm text-slate-700 mt-0.5 font-mono">{fileName}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Payer" value={d.payer} />
        <Field label="Payer ID" value={d.payer_id} />
        <Field label="Claim Type" value={d.claim_type} />
        <Field label="Patient Age" value={d.patient_age} />
        <Field label="Patient Gender" value={d.patient_gender} />
        <Field label="Place of Service" value={d.place_of_service} />
        <Field label="Provider Type" value={d.provider_type} />
        <Field label="Total Charge" value={d.total_charge ? `$${d.total_charge}` : null} />
        <Field
          label="Service Dates"
          value={d.service_dates?.length ? d.service_dates.join(", ") : null}
        />
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        {d.icd10_codes?.length ? (
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1.5">
              ICD-10 Diagnosis Codes
            </dt>
            <CodeList codes={d.icd10_codes} />
          </div>
        ) : null}

        {d.cpt_codes?.length ? (
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1.5">
              CPT / HCPCS Procedure Codes
            </dt>
            <CodeList codes={d.cpt_codes} />
          </div>
        ) : null}

        {d.modifiers?.length ? (
          <div>
            <dt className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1.5">
              Modifiers
            </dt>
            <CodeList codes={d.modifiers} />
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Billing Provider NPI" value={
            d.billing_provider_npi
              ? <span className="font-mono">{d.billing_provider_npi}</span>
              : <span className="text-red-500">Not detected</span>
          } />
          <Field label="Rendering Provider NPI" value={
            d.rendering_provider_npi
              ? <span className="font-mono">{d.rendering_provider_npi}</span>
              : <span className="text-amber-500">Not detected</span>
          } />
        </div>
      </div>

      {d.notes && (
        <div className="border-t border-slate-100 pt-4">
          <Field label="Notes" value={
            <span className="text-slate-500 italic">{d.notes}</span>
          } />
        </div>
      )}
    </div>
  );
}
