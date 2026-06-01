"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/api";
import { countries } from "@/lib/countries";
import {
  GoogleDocIcon,
  Alert01Icon,
  ArrowLeft02Icon,
  City02Icon,
  Mail01Icon,
  Building04Icon,
  SmartPhone01Icon,
  Location01Icon,
  User02Icon,
  Globe02Icon,
  LeftToRightListNumberIcon,
  Notebook01Icon,
  MoonLandingIcon,
} from "hugeicons-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import CustomCountrySelect from "@/components/ui/CustomCountrySelect";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";
import FeatureLimitLock from "@/components/subscription/FeatureLimitLock";
import { useLanguage } from "@/context/LanguageContext";

export default function CreateClientPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const subscription = useSubscriptionUsage();
  const clientLocked = subscription.isResourceLocked("clients");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientLocked) {
      setError(subscription.limitMessage("clients"));
      return;
    }
    if (!name.trim()) {
      setError(t("clients.nameRequired"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await clientApi.create({
        name,
        email,
        phone,
        company,
        address,
        city,
        state,
        country,
        zip,
        notes,
      });
      router.push("/clients");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("clients.saveError");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription.loading && clientLocked) {
    return (
      <FeatureLimitLock
        resource="clients"
        usage={subscription.usage}
        backHref="/clients"
        backLabel={t("clients.backToClients")}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link
              href="/clients"
              className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"
            >
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">{t("clients.createTitle")}</h1>
          </div>
          <p className="page-subtitle">{t("clients.createSubtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="card">
          <h3 className="text-base flex items-center gap-2 font-bold mb-5 pb-3 border-b border-border-light">
            <GoogleDocIcon /> {t("clients.infoTitle")}
          </h3>

          {error && (
            <div className="flex items-center gap-2 py-3 px-4 mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm">
              <Alert01Icon /> {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <User02Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.fullName")} *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t("clients.clientNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <Building04Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.company")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t("clients.companyPlaceholder")}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <Mail01Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("auth.email")}
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <SmartPhone01Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.phone")}
              </label>
              <PhoneInput
                international
                defaultCountry="ID"
                countrySelectComponent={CustomCountrySelect}
                className="form-input flex items-center"
                placeholder="+62 xxx xxxx xxxx"
                value={phone}
                onChange={(val) => setPhone(val || "")}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Location01Icon
                width={16}
                height={16}
                className="text-text-tertiary"
              />{" "}
              {t("clients.address")}
            </label>
            <textarea
              rows={3}
              className="form-input form-textarea"
              placeholder={t("clients.addressPlaceholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            ></textarea>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <City02Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.city")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t("clients.city")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <MoonLandingIcon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.state")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t("clients.state")}
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <LeftToRightListNumberIcon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.zip")}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={t("clients.zip")}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <Globe02Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("clients.country")}
              </label>
              <select
                className="form-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">{t("clients.chooseCountry")}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Notebook01Icon
                width={16}
                height={16}
                className="text-text-tertiary"
              />{" "}
              {t("clients.notes")}
            </label>
            <textarea
              rows={3}
              className="form-input form-textarea"
              placeholder={t("clients.notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full mt-2"
            disabled={loading}
          >
            {loading ? t("common.saving") : t("clients.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
