import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";

type UserRole = "admin" | "trainer" | "trainee" | "enterprise";

interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; role: string; firstName: string; lastName: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.id) setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setUser(data);
  }, []);

  const register = useCallback(async (data: { username: string; password: string; role: string; firstName: string; lastName: string; email?: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const userData = await res.json();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
