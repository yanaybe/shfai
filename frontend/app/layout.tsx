import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimIQ — AI Claim Review",
  description: "Detect insurance claim denial risks before submission.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 11L5 5L8 8L11 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">ClaimIQ</span>
            <span className="text-slate-300 text-sm ml-1">|</span>
            <span className="text-slate-500 text-sm">AI Claim Review</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
        <footer className="border-t border-slate-200 bg-white mt-20">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center">
            <p className="text-xs text-slate-400">
              ClaimIQ is a decision-support tool. It does not guarantee claim approval or provide legal or compliance advice.
              This product is not HIPAA-certified.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
