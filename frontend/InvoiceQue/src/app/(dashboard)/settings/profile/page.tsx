"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import CustomCountrySelect from "@/components/ui/CustomCountrySelect";

export default function ProfileSettingsPage() {
  const { t } = useLanguage();
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

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      setUserName(user.name || "");
      setUserCompany(user.company || "");
      setUserPhone(user.phone || "");
    }
  }, [user]);

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
          <h1 className="page-title">{t("account.title")}</h1>
          <p className="page-subtitle">{t("account.subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 w-full">
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
            {t("account.info")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("account.identityHint")}
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
              {savingUser ? t("common.saving") : t("account.saveProfile")}
            </button>
            {userMsg && (
              <span className="text-sm font-medium text-green-600">
                {userMsg}
              </span>
            )}
          </div>
        </div>

        {/* Change Password */}
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            {t("account.changePassword")}
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            {t("account.passwordHint")}
          </p>
          <div className="form-group mb-4">
            <label className="form-label">{t("account.oldPassword")}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t("account.oldPasswordPlaceholder")}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">{t("account.newPassword")}</label>
            <input
              type="password"
              className="form-input"
              placeholder={t("account.newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
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
    </div>
  );
}
