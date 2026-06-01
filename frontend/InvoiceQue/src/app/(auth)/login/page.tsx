"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { authApi } from "@/lib/api";
import {
  ViewIcon,
  ViewOffSlashIcon,
  CheckmarkBadge01Icon,
} from "hugeicons-react";
import { useGoogleLogin, type TokenResponse } from "@react-oauth/google";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canResendVerification, setCanResendVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("verified") === "1") {
      setSuccess(t("auth.login.verifiedSuccess"));
    }
    if (searchParams.get("reset") === "1") {
      setSuccess(t("auth.login.resetSuccess"));
    }
  }, [t]);

  const handleGoogleSuccess = async (
    tokenResponse: Omit<
      TokenResponse,
      "error" | "error_description" | "error_uri"
    >,
  ) => {
    try {
      setLoading(true);
      await googleLogin(tokenResponse.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.login.googleFailed"));
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError(t("auth.login.googleCancelled")),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCanResendVerification(false);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.login.failed");
      setError(message);
      setCanResendVerification(
        message.toLowerCase().includes("verifikasi") ||
          message.toLowerCase().includes("verified"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError(t("auth.login.enterEmail"));
      return;
    }

    setResending(true);
    setError("");
    try {
      const res = await authApi.resendVerification(email);
      setSuccess(res.message || t("auth.login.verificationResent"));
      setCanResendVerification(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.login.resendFailed"),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen lg:h-screen max-lg:h-[100dvh] lg:overflow-hidden max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:snap-x max-lg:snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex-1 max-lg:w-screen max-lg:h-full max-lg:flex-none max-lg:snap-center bg-gradient-to-br from-red-600 to-red-500 text-white flex items-center justify-center p-[60px_40px] max-lg:p-[40px_24px] relative overflow-hidden">
        <div className="relative z-10 max-w-[600px] max-lg:h-full max-lg:flex max-lg:flex-col max-lg:justify-center">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/images/invoiceque.svg"
              alt="InvoiceQu Logo"
              className="h-12 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-[-0.5px] mt-1.5">
                InvoiceQu
              </span>
              <span className="text-lg text-white font-medium tracking-[0.5px]">
                {t("common.appTagline")}
              </span>
            </div>
          </div>
          <h1 className="text-[42px] max-lg:text-[32px] max-sm:text-[26px] font-black leading-[1.15] mb-5 tracking-[-1px]">
            {t("auth.hero.invoiceBusinessTitle")}
            <br />
            {t("auth.hero.paymentLinkTitle")}
            <br />
            dengan{" "}
            <span className="bg-gradient-to-br from-red-300 to-white bg-clip-text text-transparent">
              {t("auth.hero.easyAccent")}
            </span>
          </h1>
          <p className="text-base max-sm:text-sm opacity-85 leading-[1.7] mb-7">
            {t("auth.hero.loginDescription")}
          </p>
          <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-2.5">
            <div className="flex items-center gap-2.5 text-sm font-medium opacity-90 py-2">
              <CheckmarkBadge01Icon size={18} />{" "}
              {t("auth.hero.benefitAutoInvoice")}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium opacity-90 py-2">
              <CheckmarkBadge01Icon size={18} />{" "}
              {t("auth.hero.benefitInstantPayment")}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium opacity-90 py-2">
              <CheckmarkBadge01Icon size={18} />{" "}
              {t("auth.hero.benefitRealtimeReport")}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium opacity-90 py-2">
              <CheckmarkBadge01Icon size={18} />{" "}
              {t("auth.hero.benefitMultiDevice")}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium opacity-90 py-2">
              <CheckmarkBadge01Icon size={18} />{" "}
              {t("auth.hero.benefitTaskManagement")}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-white/5"></div>
          <div className="absolute -bottom-[60px] -left-[60px] w-[200px] h-[200px] rounded-full bg-white/10"></div>
          <div className="absolute top-1/2 right-[10%] w-[120px] h-[120px] rounded-full bg-white/5"></div>
        </div>

        {/* Mobile Swipe Indicators */}
        <div className="lg:hidden absolute bottom-8 left-0 w-full flex flex-col items-center justify-center gap-3 z-20">
          <span className="text-white/90 text-sm font-medium animate-pulse flex items-center gap-2">
            {t("auth.login.swipe")}
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
          <div className="flex gap-2">
            <div className="w-6 h-1.5 rounded-full bg-white"></div>
            <div className="w-2 h-1.5 rounded-full bg-white/40"></div>
          </div>
        </div>
      </div>

      <div className="w-[480px] max-lg:w-screen max-lg:h-full max-lg:flex-none max-lg:snap-center p-10 max-lg:p-8 max-sm:p-[24px_16px] bg-bg-primary lg:h-screen lg:overflow-y-auto max-lg:overflow-y-auto relative">
        <div className="lg:hidden absolute top-6 right-6 flex gap-2 z-20">
          <div className="w-2 h-1.5 rounded-full bg-gray-300"></div>
          <div className="w-6 h-1.5 rounded-full bg-red-600"></div>
        </div>
        <div className="w-full max-w-[380px] mx-auto min-h-full flex flex-col justify-center py-8">
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold mb-2 tracking-[-0.5px]">
              {t("auth.login.title")} 👋
            </h2>
            <p className="text-text-secondary text-[15px]">
              {t("auth.login.subtitle")}
            </p>
          </div>

          {error && (
            <div className="p-3 px-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
              {error}
              {canResendVerification && (
                <button
                  type="button"
                  className="block mt-3 text-red-600 font-semibold underline"
                  onClick={handleResendVerification}
                  disabled={resending}
                >
                  {resending
                    ? t("auth.login.resendSending")
                    : t("auth.login.resendVerification")}
                </button>
              )}
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
            <div className="form-group">
              <label className="form-label flex justify-between">
                <span>{t("auth.password")}</span>
                <Link
                  href="/forgot-password"
                  className="text-[13px] text-red-600 no-underline font-medium hover:underline"
                >
                  {t("auth.login.forgotPassword")}
                </Link>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-secondary opacity-60 hover:opacity-100"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <ViewOffSlashIcon width={18} height={18} />
                  ) : (
                    <ViewIcon width={18} height={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mb-4"
              disabled={loading}
            >
              {loading ? t("auth.processing") : t("auth.login.submit")}
            </button>

            <div className="flex items-center my-4 text-text-tertiary text-[13px] before:content-[''] before:flex-1 before:border-b before:border-border-color after:content-[''] after:flex-1 after:border-b after:border-border-color">
              <span className="px-4">{t("auth.or")}</span>
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="btn btn-secondary btn-lg w-full mb-6"
            >
              <span className="flex items-center justify-center gap-2">
                <img
                  src="/images/icons8-google.svg"
                  alt="Google"
                  className="w-[32px] h-[32px]"
                />
              </span>{" "}
              {t("auth.login.withGoogle")}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            {t("auth.login.noAccount")}{" "}
            <Link
              href="/register"
              className="text-red-600 font-semibold no-underline hover:underline"
            >
              {t("auth.login.registerFree")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
