import UploadZone from "@/components/upload/UploadZone";

export default function HomePage() {
  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Claim Denial Risk Analysis
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Upload a CMS-1500 or billing system export. Our AI will extract the claim data,
          run validation checks, and identify denial risks before you submit.
        </p>
      </div>

      {/* Upload */}
      <UploadZone />

      {/* Trust indicators */}
      <div className="border border-slate-200 rounded-xl bg-white p-5 space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">What we check</p>
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
          {[
            "ICD-10 / CPT code validity",
            "Modifier completeness",
            "Provider NPI presence",
            "E&M visit level appropriateness",
            "Payer-specific denial patterns",
            "NCCI bundling risk",
            "Place of service accuracy",
            "Anesthesia code requirements",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-sm text-slate-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
