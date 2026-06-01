"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  type User,
  type AuthResponse,
  type EmailVerificationResponse,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    company?: string,
    phone?: string,
  ) => Promise<EmailVerificationResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;

    const restoreSession = () => {
      if (cancelled) {
        return;
      }

      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("refresh_token");
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    queueMicrotask(restoreSession);

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthResponse = useCallback((res: AuthResponse) => {
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("token", res.token);
    localStorage.setItem("refresh_token", res.refresh_token);
    localStorage.setItem("user", JSON.stringify(res.user));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      handleAuthResponse(res);
    },
    [handleAuthResponse],
  );

  const googleLogin = useCallback(
    async (idToken: string) => {
      const res = await authApi.googleLogin(idToken);
      handleAuthResponse(res);
    },
    [handleAuthResponse],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      company?: string,
      phone?: string,
    ) => {
      return authApi.register(name, email, password, company, phone);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }, []);

  // Auto-logout when API returns 401 (token expired / invalid)
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    const handleForceLogout = () => {
      logoutRef.current();
      router.replace("/login");
    };

    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        googleLogin,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
