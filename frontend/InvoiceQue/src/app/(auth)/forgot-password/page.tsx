"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      setSuccess(res.message || t("auth.forgot.successDefault"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.forgot.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-[460px] bg-bg-card border border-border-color rounded-xl p-8 shadow-xl">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold mb-2">
            {t("auth.forgot.title")}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t("auth.forgot.subtitle")}
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
            <label className="form-label">{t("auth.email")}</label>
            <input
              type="email"
              className="form-input"
              placeholder="email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full mb-4"
            disabled={loading}
          >
            {loading ? t("auth.sending") : t("auth.forgot.submit")}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          {t("auth.forgot.remembered")}{" "}
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
