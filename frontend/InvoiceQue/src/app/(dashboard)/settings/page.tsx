"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { invoiceSettingsApi, authApi, googleApi } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import XenditSetupCard from "@/components/XenditSetupCard";
import PaypalSetupCard from "@/components/PaypalSetupCard";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import CustomCountrySelect from "@/components/ui/CustomCountrySelect";
import Link from "next/link";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";
import { isFeatureUnlocked } from "@/lib/subscription-limits";
import {
  Payment02Icon,
  Building02Icon,
  PaintBoardIcon,
  Notification01Icon,
} from "hugeicons-react";

const colorPresets = [
  "#DC2626",
  "#2563EB",
  "#7C3AED",
  "#059669",
  "#D97706",
  "#DB2777",
  "#0891B2",
  "#4F46E5",
];

export default function SettingsPage() {
  const { t } = useLanguage();
  const subscription = useSubscriptionUsage();
  const xenditUnlocked = isFeatureUnlocked(subscription.usage, "xendit_integration");
  const paypalUnlocked = isFeatureUnlocked(subscription.usage, "paypal_integration");
  const defaultFooterText = t("settings.defaultFooter");

  // Business profile state
  const [bizName, setBizName] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizWebsite, setBizWebsite] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#DC2626");
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Payment settings state
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState("");

  // User profile state
  const { user } = useAuth();
  const [userName, setUserName] = useState("");
  const [userCompany, setUserCompany] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  // Change password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  // Google integration state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [googleMsg, setGoogleMsg] = useState("");

  // Load Google connection status
  useEffect(() => {
    checkGoogleStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    if (code) {
      handleGoogleConnect(code);
    }
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const res = await googleApi.getStatus();
      setGoogleConnected(res.connected);
    } catch (e) {
      console.error("Failed to check Google integration status", e);
    } finally {
      setCheckingGoogle(false);
    }
  };

  const handleGoogleConnect = async (code: string) => {
    setCheckingGoogle(true);
    setGoogleMsg("Connecting to Google...");
    try {
      const redirectUri = window.location.origin + "/settings";
      await googleApi.connect(code, redirectUri);
      setGoogleConnected(true);
      setGoogleMsg("✅ Google account connected successfully!");
      // Clean up URL query parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("scope");
      url.searchParams.delete("authuser");
      url.searchParams.delete("prompt");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      setTimeout(() => setGoogleMsg(""), 5000);
    } catch (err: any) {
      setGoogleMsg(`❌ Connection failed: ${err.message || err}`);
    } finally {
      setCheckingGoogle(false);
    }
  };

  const startGoogleOAuth = async () => {
    setCheckingGoogle(true);
    setGoogleMsg("Generating Google Auth URL...");
    try {
      const redirectUri = window.location.origin + "/settings";
      const { url } = await googleApi.getAuthUrl(redirectUri);
      window.location.href = url;
    } catch (err: any) {
      setGoogleMsg(`❌ Failed to start OAuth: ${err.message || err}`);
      setCheckingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect your Google account? This will stop automatic Google Meet link generation.")) {
      return;
    }
    setCheckingGoogle(true);
    try {
      await googleApi.disconnect();
      setGoogleConnected(false);
      setGoogleMsg("✅ Google account disconnected.");
      setTimeout(() => setGoogleMsg(""), 5000);
    } catch (err: any) {
      setGoogleMsg(`❌ Disconnect failed: ${err.message || err}`);
    } finally {
      setCheckingGoogle(false);
    }
  };

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      setUserName(user.name || "");
      setUserCompany(user.company || "");
      setUserPhone(user.phone || "");
    }
  }, [user]);

  // Load invoice settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setBizName(s.business_name || "");
      setBizEmail(s.business_email || "");
      setBizPhone(s.business_phone || "");
      setBizWebsite(s.business_website || "");
      setBizAddress(s.business_address || "");
      setLogoUrl(s.logo_url || "");
      setAccentColor(s.accent_color || "#DC2626");
      setFooterText(s.footer_text || defaultFooterText);
      setBankName(s.bank_name || "");
      setBankAccountNumber(s.bank_account_number || "");
      setBankAccountName(s.bank_account_name || "");
    } catch {
      // Use defaults if API not available
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg("");
    try {
      await invoiceSettingsApi.update({
        business_name: bizName,
        business_email: bizEmail,
        business_phone: bizPhone,
        business_website: bizWebsite,
        business_address: bizAddress,
        logo_url: logoUrl,
        accent_color: accentColor,
        footer_text: footerText,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
      });
      setProfileMsg(`✅ ${t("settings.saveSuccess")}`);
      setTimeout(() => setProfileMsg(""), 3000);
    } catch {
      setProfileMsg(`❌ ${t("settings.saveFailed")}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveUserProfile = async () => {
    setSavingUser(true);
    setUserMsg("");
    try {
      await authApi.updateProfile(userName, userCompany, userPhone);
      setUserMsg(`✅ ${t("settings.saveSuccess")}`);
      setTimeout(() => setUserMsg(""), 3000);
      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            name: userName,
            company: userCompany,
            phone: userPhone,
          }),
        );
      }
    } catch {
      setUserMsg(`❌ ${t("settings.saveFailed")}`);
    } finally {
      setSavingUser(false);
    }
  };

  const savePassword = async () => {
    if (!oldPassword || !newPassword) return;
    setSavingPassword(true);
    setPasswordMsg("");
    try {
      await authApi.changePassword(oldPassword, newPassword);
      setPasswordMsg(`✅ ${t("account.passwordChanged")}`);
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    } catch {
      setPasswordMsg(`❌ ${t("account.passwordChangeFailed")}`);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("settings.title")}</h1>
          <p className="page-subtitle">{t("settings.subtitle")}</p>
        </div>
        <div className="flex">
          <Link
            href="/subscription"
            className="btn btn-secondary flex items-center gap-2"
          >
            <span>{t("settings.upgrade")}</span>
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {/* User Profile */}
        <div className="card">
          <h3 className="flex items-center gap-2 text-base font-bold mb-5 pb-3 border-b border-border-light">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {t("account.userProfile")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("account.userProfileHint")}
          </p>
          <div className="form-group mb-4">
            <label className="form-label">{t("account.emailLocked")}</label>
            <input
              type="text"
              className="form-input bg-bg-main text-text-tertiary"
              value={user?.email || ""}
              disabled
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t("account.fullName")}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t("account.namePlaceholder")}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("account.company")}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t("account.companyPlaceholder")}
                value={userCompany}
                onChange={(e) => setUserCompany(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">{t("account.phone")}</label>
            <PhoneInput
              international
              defaultCountry="ID"
              countrySelectComponent={CustomCountrySelect}
              className="form-input flex items-center"
              placeholder="+62 812 3456 7890"
              value={userPhone}
              onChange={(val) => setUserPhone(val || "")}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary"
              onClick={saveUserProfile}
              disabled={savingUser}
            >
              {savingUser ? t("common.saving") : t("account.saveUserProfile")}
            </button>
            {userMsg && (
              <span className="text-sm font-medium text-green-600">
                {userMsg}
              </span>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border-light">
            <h4 className="font-bold mb-4 text-sm flex items-center gap-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              {t("account.changePassword")}
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t("account.oldPassword")}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t("account.oldPasswordPlaceholder")}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("account.newPassword")}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t("account.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                className="btn btn-secondary"
                onClick={savePassword}
                disabled={savingPassword || !oldPassword || !newPassword}
              >
                {savingPassword
                  ? t("common.saving")
                  : t("account.changePassword")}
              </button>
              {passwordMsg && (
                <span className="text-sm font-medium text-green-600">
                  {passwordMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Business Profile */}
        <div className="card">
          <h3 className="flex items-center gap-2 text-base font-bold mb-5 pb-3 border-b border-border-light">
            <Building02Icon /> {t("settings.businessProfile")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("settings.businessProfileHint")}
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t("settings.businessName")}</label>
              <input
                type="text"
                className="form-input"
                placeholder="PT Contoh Sukses"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("settings.businessEmail")}
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="hello@bisnis.com"
                value={bizEmail}
                onChange={(e) => setBizEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t("settings.phone")}</label>
              <PhoneInput
                international
                defaultCountry="ID"
                countrySelectComponent={CustomCountrySelect}
                className="form-input flex items-center"
                placeholder="+62 812 3456 7890"
                value={bizPhone}
                onChange={(val) => setBizPhone(val || "")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("settings.website")}</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://bisnis.com"
                value={bizWebsite}
                onChange={(e) => setBizWebsite(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t("settings.address")}</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Jl. Contoh No. 123, Jakarta"
              value={bizAddress}
              onChange={(e) => setBizAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Invoice Design */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light">
            <PaintBoardIcon /> {t("settings.invoiceDesign")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("settings.invoiceDesignHint")}
          </p>

          {/* Color Picker */}
          <div className="form-group">
            <label className="form-label">{t("settings.accentColor")}</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: c,
                    border:
                      accentColor === c
                        ? "3px solid var(--text-primary)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-8 border-none cursor-pointer"
              />
              <input
                type="text"
                className="form-input w-[100px] font-mono"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">
              {t("settings.companyLogoOptional")}
            </label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement("canvas");
                      const MAX_WIDTH = 300;
                      const MAX_HEIGHT = 300;
                      let width = img.width;
                      let height = img.height;

                      if (width > height) {
                        if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                        }
                      } else {
                        if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                        }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext("2d");
                      ctx?.drawImage(img, 0, 0, width, height);

                      // Compress to base64
                      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                      setLogoUrl(dataUrl);
                    };
                    img.src = event.target?.result as string;
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-sm text-text-secondary
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-red-50 file:text-red-600
                    hover:file:bg-red-100"
              />
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap font-semibold"
                >
                  {t("settings.removeLogo")}
                </button>
              )}
            </div>

            {logoUrl && (
              <div className="mt-3 p-3 bg-transparent border border-border-light rounded-md flex items-center justify-center h-24 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Preview */}
          <div
            className="mt-6 p-4 rounded-[10px]"
            style={{ border: `2px solid ${accentColor}` }}
          >
            <div
              className="flex justify-between items-center pb-3 mb-3"
              style={{ borderBottom: `3px solid ${accentColor}` }}
            >
              <div className="flex gap-4 items-center">
                {logoUrl && (
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div>
                  <div
                    className="font-extrabold text-xl"
                    style={{ color: accentColor }}
                  >
                    {bizName || t("settings.businessNameFallback")}
                  </div>
                  {bizEmail && (
                    <div className="text-[10px] text-[#888]">{bizEmail}</div>
                  )}
                  {bizPhone && (
                    <div className="text-[10px] text-[#888]">{bizPhone}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-base">INVOICE</div>
                <div
                  className="text-xs font-bold"
                  style={{ color: accentColor }}
                >
                  INV-2025-001
                </div>
              </div>
            </div>
            <div className="text-center text-[10px] text-[#999] pt-2 border-t border-[#eee]">
              {footerText}
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">{t("settings.footerText")}</label>
            <input
              type="text"
              className="form-input"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={t("settings.footerPlaceholder")}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary"
            onClick={saveProfile}
            disabled={savingProfile}
          >
            {savingProfile
              ? t("common.saving")
              : t("settings.saveProfileDesign")}
          </button>
          {profileMsg && <span className="text-sm">{profileMsg}</span>}
        </div>

        {/* Payment Settings */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light">
            <Payment02Icon /> {t("settings.paymentSettings")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("settings.paymentSettingsHint")}
          </p>
          <div className="form-group">
            <label className="form-label">{t("settings.bankName")}</label>
            <input
              type="text"
              className="form-input"
              placeholder="Bank Central Asia (BCA)"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                {t("settings.accountNumber")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="123 456 7890"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("settings.accountHolder")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="PT Contoh Sukses"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <button
              className="btn btn-primary"
              onClick={async () => {
                setSavingPayment(true);
                setPaymentMsg("");
                try {
                  await invoiceSettingsApi.update({
                    business_name: bizName,
                    business_email: bizEmail,
                    business_phone: bizPhone,
                    business_website: bizWebsite,
                    business_address: bizAddress,
                    logo_url: logoUrl,
                    accent_color: accentColor,
                    footer_text: footerText,
                    bank_name: bankName,
                    bank_account_number: bankAccountNumber,
                    bank_account_name: bankAccountName,
                  });
                  setPaymentMsg(`✅ ${t("settings.saveSuccess")}`);
                  setTimeout(() => setPaymentMsg(""), 3000);
                } catch {
                  setPaymentMsg(`❌ ${t("settings.saveFailed")}`);
                } finally {
                  setSavingPayment(false);
                }
              }}
              disabled={savingPayment}
            >
              {savingPayment ? t("common.saving") : t("settings.savePayment")}
            </button>
            {paymentMsg && <span className="text-sm">{paymentMsg}</span>}
          </div>
          {/* Online Payment Gateways — Pro only */}
          <div className="mt-6 pt-6 border-t border-border-light">
            <h4 className="font-bold mb-1 text-sm flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {t("settings.onlinePayments") || "Online Payment Gateways"}
            </h4>
            <p className="text-[12px] text-text-tertiary mb-4">
              {t("settings.onlinePaymentsHint") || "Terima pembayaran online langsung dari invoice Anda"}
            </p>

            {xenditUnlocked && paypalUnlocked ? (
              <div className="flex flex-col gap-4">
                <XenditSetupCard />
                <PaypalSetupCard />
              </div>
            ) : (
              <div className="relative">
                {/* Blurred preview */}
                <div className="pointer-events-none select-none opacity-40 blur-[2px]">
                  <div className="flex flex-col gap-4">
                    <XenditSetupCard />
                    <PaypalSetupCard />
                  </div>
                </div>
                {/* Upgrade overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-bg-card/95 backdrop-blur-sm border border-border-color rounded-xl p-6 text-center shadow-xl max-w-sm">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h4 className="font-extrabold text-base mb-1">Fitur Pro</h4>
                    <p className="text-[13px] text-text-secondary mb-4">
                      Integrasi Xendit & PayPal tersedia untuk paket <span className="font-bold text-red-500">Pro</span> ke atas.
                    </p>
                    <Link
                      href="/subscription"
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      Upgrade ke Pro
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light">
            <Notification01Icon /> {t("settings.notifications")}
          </h3>
          <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
            <div>
              <div className="text-sm font-semibold mb-0.5">
                {t("settings.notificationInvoiceSent")}
              </div>
              <div className="text-xs text-text-tertiary">
                {t("settings.notificationInvoiceSentHint")}
              </div>
            </div>
            <label className="relative inline-block w-12 h-[26px] shrink-0">
              <input
                type="checkbox"
                defaultChecked
                className="peer opacity-0 w-0 h-0"
              />
              <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
            </label>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
            <div>
              <div className="text-sm font-semibold mb-0.5">
                {t("settings.notificationPaymentReceived")}
              </div>
              <div className="text-xs text-text-tertiary">
                {t("settings.notificationPaymentReceivedHint")}
              </div>
            </div>
            <label className="relative inline-block w-12 h-[26px] shrink-0">
              <input
                type="checkbox"
                defaultChecked
                className="peer opacity-0 w-0 h-0"
              />
              <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
            </label>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
            <div>
              <div className="text-sm font-semibold mb-0.5">
                {t("settings.notificationInvoiceOverdue")}
              </div>
              <div className="text-xs text-text-tertiary">
                {t("settings.notificationInvoiceOverdueHint")}
              </div>
            </div>
            <label className="relative inline-block w-12 h-[26px] shrink-0">
              <input
                type="checkbox"
                defaultChecked
                className="peer opacity-0 w-0 h-0"
              />
              <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
            </label>
          </div>
        </div>

        {/* Google Integration */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            {t("settings.googleIntegration")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("settings.googleIntegrationDesc")}
          </p>
          <div className="p-4 rounded-xl border border-border-light bg-bg-main/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-border-light">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-sm">Google Account</div>
                <div className="text-xs text-text-tertiary">
                  {checkingGoogle
                    ? "Checking connection status..."
                    : googleConnected
                    ? t("settings.googleConnected")
                    : t("settings.googleDisconnected")}
                </div>
              </div>
            </div>
            <div>
              {googleConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  disabled={checkingGoogle}
                  className="btn btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm font-semibold py-2 px-4 rounded-lg"
                >
                  {t("settings.disconnectGoogle")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startGoogleOAuth}
                  disabled={checkingGoogle}
                  className="btn btn-primary text-sm font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  {t("settings.connectGoogle")}
                </button>
              )}
            </div>
          </div>
          {googleMsg && (
            <div className="mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-bg-main/50 text-text-secondary border border-border-light animate-pulse">
              {googleMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
