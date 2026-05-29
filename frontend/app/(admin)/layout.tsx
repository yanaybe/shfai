"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-purple-600 text-white text-xs text-center py-1 font-medium tracking-wide">
          ADMIN MODE — Platform-wide access
        </div>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
