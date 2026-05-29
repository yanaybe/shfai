"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadClaim, pollUntilComplete } from "@/lib/api";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.tiff,.tif";
const STEPS = ["Uploading document", "Extracting text", "Parsing claim data", "Running rule checks", "AI analysis"];

function stepFromStatus(status: string): number {
  if (status === "pending") return 0;
  if (status === "processing") return 2;
  if (status === "completed") return 4;
  return 1;
}

export default function UploadZone({ onComplete }: { onComplete?: (id: string) => void } = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "error">("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (f: File) => {
    setFile(f);
    setPhase("idle");
    setErrorMsg("");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setPhase("uploading");
    setActiveStep(0);
    setErrorMsg("");

    try {
      const { id } = await uploadClaim(file);
      setPhase("processing");
      setActiveStep(1);

      await pollUntilComplete(id, (status) => {
        setActiveStep(stepFromStatus(status));
      });

      setActiveStep(4);
      if (onComplete) onComplete(id);
      else router.push(`/claims/${id}`);
    } catch (e: unknown) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "An unexpected error occurred.");
    }
  };

  const isRunning = phase === "uploading" || phase === "processing";

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => !isRunning && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
          dragging
            ? "border-blue-500 bg-blue-50"
            : file
              ? "border-slate-300 bg-slate-50"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
          isRunning ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleChange}
        />

        {file ? (
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-medium text-slate-800">{file.name}</p>
            <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} KB — click to change</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-slate-700 font-medium">Drop your claim document here</p>
              <p className="text-slate-400 text-sm mt-1">CMS-1500, UB-04 export, or scanned image</p>
            </div>
            <p className="text-xs text-slate-400">PDF · PNG · JPG · TIFF — up to 25MB</p>
          </div>
        )}
      </div>

      {/* Processing steps */}
      {isRunning && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <p className="text-sm font-medium text-slate-700">Processing claim document</p>
          <div className="space-y-2.5">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={[
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                  i < activeStep
                    ? "bg-green-100"
                    : i === activeStep
                      ? "bg-blue-100"
                      : "bg-slate-100",
                ].join(" ")}>
                  {i < activeStep ? (
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i === activeStep ? (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-slate-300 rounded-full" />
                  )}
                </div>
                <span className={[
                  "text-sm",
                  i < activeStep ? "text-slate-400 line-through" : i === activeStep ? "text-slate-800 font-medium" : "text-slate-400",
                ].join(" ")}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium">Processing failed</p>
          <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      {phase !== "uploading" && phase !== "processing" && (
        <button
          onClick={handleSubmit}
          disabled={!file}
          className={[
            "w-full py-3 rounded-lg font-medium text-sm transition-all",
            file
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          ].join(" ")}
        >
          Analyze Claim
        </button>
      )}
    </div>
  );
}
