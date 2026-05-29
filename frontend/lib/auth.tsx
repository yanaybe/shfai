"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, logout as apiLogout } from "./api";
import { User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, refresh: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await getMe();
      setUser(me as User);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout: apiLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
