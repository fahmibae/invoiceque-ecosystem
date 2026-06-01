"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { authApi } from "@/lib/api";
import {
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Loading01Icon,
} from "hugeicons-react";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState(t("auth.verify.loadingMessage"));

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token") || "";

    async function verify() {
      if (!token) {
        setState("error");
        setMessage(t("auth.verify.missingToken"));
        return;
      }

      try {
        const res = await authApi.verifyEmail(token);
        setState("success");
        setMessage(res.message || t("auth.verify.successDefault"));
      } catch (err) {
        setState("error");
        setMessage(
          err instanceof Error ? err.message : t("auth.verify.failed"),
        );
      }
    }

    verify();
  }, [t]);

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] bg-bg-card border border-border-color rounded-xl p-8 shadow-xl text-center">
        <div className="flex justify-center mb-5">
          {state === "loading" && (
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 flex items-center justify-center">
              <Loading01Icon width={32} height={32} className="animate-spin" />
            </div>
          )}
          {state === "success" && (
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckmarkCircle01Icon width={34} height={34} />
            </div>
          )}
          {state === "error" && (
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 flex items-center justify-center">
              <CancelCircleIcon width={34} height={34} />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-extrabold mb-2">
          {state === "success"
            ? t("auth.verify.successTitle")
            : state === "error"
              ? t("auth.verify.errorTitle")
              : t("auth.verify.waitTitle")}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          {message}
        </p>

        {state === "success" ? (
          <Link href="/login?verified=1" className="btn btn-primary w-full">
            {t("auth.verify.loginNow")}
          </Link>
        ) : state === "error" ? (
          <div className="flex flex-col gap-2">
            <Link href="/login" className="btn btn-primary w-full">
              {t("auth.backToLogin")}
            </Link>
            <Link href="/register" className="btn btn-secondary w-full">
              {t("auth.verify.registerAgain")}
            </Link>
          </div>
        ) : (
          <div className="text-xs text-text-tertiary">
            {t("auth.verify.keepOpen")}
          </div>
        )}
      </div>
    </div>
  );
}
