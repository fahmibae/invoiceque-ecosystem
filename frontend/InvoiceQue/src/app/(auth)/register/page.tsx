"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { authApi } from "@/lib/api";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import CustomCountrySelect from "@/components/ui/CustomCountrySelect";
import {
  Rocket01Icon,
  CreditCardIcon,
  LockIcon,
  GlobeIcon,
  TaskDaily01Icon,
} from "hugeicons-react";
import { useGoogleLogin, type TokenResponse } from "@react-oauth/google";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, googleLogin } = useAuth();
  const { t } = useLanguage();

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

    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await register(
        name,
        email,
        password,
        company || undefined,
        phone || undefined,
      );
      setRegisteredEmail(res.email || email);
      setSuccess(
        res.message || t("auth.register.successDefault"),
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("auth.register.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = registeredEmail || email;
    if (!targetEmail) {
      setError(t("auth.login.enterEmail"));
      return;
    }

    setError("");
    setResending(true);
    try {
      const res = await authApi.resendVerification(targetEmail);
      setSuccess(res.message || t("auth.login.verificationResent"));
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
            {t("auth.register.heroTitle")}
            <br />
            <span className="bg-gradient-to-br from-red-300 to-white bg-clip-text text-transparent">
              {t("auth.register.heroAccent")}
            </span>
          </h1>
          <p className="text-base max-sm:text-sm opacity-85 leading-[1.7] mb-7">
            {t("auth.register.heroDescription")}
          </p>
          <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-2.5">
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2">
              <Rocket01Icon className="size-5" />{" "}
              {t("auth.register.benefitSetup")}
            </div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2">
              <CreditCardIcon className="size-5" />{" "}
              {t("auth.register.benefitFree")}
            </div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2">
              <LockIcon className="size-5" />{" "}
              {t("auth.register.benefitSecure")}
            </div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2">
              <GlobeIcon className="size-5" />{" "}
              {t("auth.register.benefitAccess")}
            </div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2">
              <TaskDaily01Icon className="size-5" />{" "}
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
            {t("auth.register.swipe")}
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
              {t("auth.register.title")} 🚀
            </h2>
            <p className="text-text-secondary text-[15px]">
              {t("auth.register.subtitle")}
            </p>
          </div>

          {error && (
            <div className="p-3 px-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm mb-4">
              <div className="font-semibold mb-1">
                {t("auth.register.checkEmail")}
              </div>
              <p className="leading-relaxed">{success}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResendVerification}
                  disabled={resending}
                >
                  {resending ? t("auth.sending") : t("auth.register.resend")}
                </button>
                <Link href="/login" className="btn btn-primary btn-sm">
                  {t("auth.backToLogin")}
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t("auth.register.fullName")}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t("auth.register.fullNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <label className="form-label">
                {t("auth.register.companyOptional")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t("auth.register.companyPlaceholder")}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("auth.register.phoneOptional")}
              </label>
              <PhoneInput
                international
                defaultCountry="ID"
                countrySelectComponent={CustomCountrySelect}
                className="form-input flex items-center"
                placeholder="+62 812 3456 7890"
                value={phone}
                onChange={(val) => setPhone(val || "")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("auth.password")}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t("auth.register.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("auth.register.confirmPassword")}
              </label>
              <input
                type="password"
                className="form-input"
                placeholder={t("auth.register.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mb-4"
              disabled={loading}
            >
              {loading ? t("auth.processing") : t("auth.register.submit")}
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
                />{" "}
                {t("auth.register.withGoogle")}
              </span>
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            {t("auth.register.haveAccount")}{" "}
            <Link
              href="/login"
              className="text-red-600 font-semibold no-underline hover:underline"
            >
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
