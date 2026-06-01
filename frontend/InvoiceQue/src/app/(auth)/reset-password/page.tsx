"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { authApi } from "@/lib/api";
import { ViewIcon, ViewOffSlashIcon } from "hugeicons-react";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const resetToken = searchParams.get("token") || "";
    setToken(resetToken);

    if (!resetToken) {
      setError(t("auth.reset.missingToken"));
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError(t("auth.reset.missingToken"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.reset.minPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.reset.confirmMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword(token, password);
      setSuccess(res.message || t("auth.reset.successDefault"));
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => router.push("/login?reset=1"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.reset.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-[460px] bg-bg-card border border-border-color rounded-xl p-8 shadow-xl">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold mb-2">
            {t("auth.reset.title")}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t("auth.reset.subtitle")}
          </p>
        </div>

        {error && (
          <div className="p-3 px-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t("auth.reset.newPassword")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={!token || loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-secondary opacity-60 hover:opacity-100"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={
                  showPassword
                    ? t("auth.reset.hidePassword")
                    : t("auth.reset.showPassword")
                }
              >
                {showPassword ? (
                  <ViewOffSlashIcon width={18} height={18} />
                ) : (
                  <ViewIcon width={18} height={18} />
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("auth.register.confirmPassword")}
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={!token || loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full mb-4"
            disabled={!token || loading}
          >
            {loading ? t("common.saving") : t("auth.reset.submit")}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          {t("auth.reset.oldPassword")}{" "}
          <Link
            href="/login"
            className="text-red-600 font-semibold no-underline hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
