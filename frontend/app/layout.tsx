import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ClaimIQ — Healthcare Claims Intelligence",
  description: "AI-powered insurance claim denial risk detection for U.S. healthcare providers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
