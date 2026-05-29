"use client";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/upload/UploadZone";

export default function UploadPage() {
  const router = useRouter();
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload Claim</h1>
        <p className="text-sm text-slate-500 mt-1">Upload a CMS-1500, UB-04, or billing system export for AI analysis.</p>
      </div>
      <UploadZone onComplete={id => router.push(`/claims/${id}`)} />
    </div>
  );
}
