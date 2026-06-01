"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  clientApi,
  quotationApi,
  type Client,
  invoiceSettingsApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  GoogleDocIcon,
  User02Icon,
  ArrowLeft02Icon,
  PackageIcon,
} from "hugeicons-react";
import CurrencySelect from "@/components/ui/CurrencySelect";
import { ALL_SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { useLanguage } from "@/context/LanguageContext";

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
}

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const { t, intlLocale } = useLanguage();
  const quotationId = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "", quantity: 1, price: 0 },
  ]);
  const [tax, setTax] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyInitial, setCompanyInitial] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsRes, qt, settings] = await Promise.all([
          clientApi.list(undefined, 1, 100),
          quotationApi.get(quotationId),
          invoiceSettingsApi.get().catch(() => null),
        ]);

        setClients(clientsRes.data || []);

        if (settings) {
          setCompanyInitial(
            (settings.business_name || "").substring(0, 2).toUpperCase(),
          );
          setAccentColor(settings.accent_color || "");
        }

        // Check if editable
        if (qt.status !== "draft") {
          setError(t("quotationForm.notEditable"));
          setLoading(false);
          return;
        }

        // Pre-fill form
        setQuotationNumber(qt.quotation_number);
        setSelectedClient(qt.client_id);
        setCurrency(qt.currency || "IDR");
        setNotes(qt.notes || "");
        setValidUntil(qt.valid_until || "");
        setDiscount(qt.discount || 0);

        // Reverse-calculate tax percentage from subtotal and tax amount
        const subtotal = qt.items.reduce(
          (s: number, i: { quantity: number; price: number }) =>
            s + i.quantity * i.price,
          0,
        );
        if (subtotal > 0 && qt.tax > 0) {
          setTax(Math.round((qt.tax / subtotal) * 100));
        } else {
          setTax(0);
        }

        if (qt.items.length > 0) {
          setItems(
            qt.items.map(
              (
                item: { description: string; quantity: number; price: number },
                idx: number,
              ) => ({
                id: idx + 1,
                description: item.description,
                quantity: item.quantity,
                price: item.price,
              }),
            ),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("quotations.loadError"));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [quotationId, t]);

  const addItem = () =>
    setItems([
      ...items,
      { id: Date.now(), description: "", quantity: 1, price: 0 },
    ]);
  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };
  const updateItem = (
    id: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const taxAmount = (subtotal * tax) / 100;
  const total = subtotal + taxAmount - discount;
  const client = clients.find((c) => c.id === selectedClient);

  const handleSubmit = async () => {
    if (!selectedClient) {
      setError(t("invoiceForm.selectClientError"));
      return;
    }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError(t("quotationForm.minItemError"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await quotationApi.update(quotationId, {
        client_id: selectedClient,
        client_name: client?.name || "",
        client_email: client?.email,
        items: validItems.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          price: i.price,
        })),
        tax: taxAmount,
        discount,
        valid_until: validUntil,
        notes,
        currency,
      });
      router.push(`/quotations/${quotationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("paymentForm.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>{t("quotationForm.loading")}</p>
      </div>
    );
  }

  if (error && !selectedClient) {
    return (
      <div className="animate-fade-in p-10 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/quotations" className="btn btn-primary">
          {t("quotationForm.backToQuotations")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/quotations/${quotationId}`}
              className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"
            >
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">{t("quotationForm.editTitle")}</h1>
          </div>
          <p className="page-subtitle">
            {t("quotationForm.editSubtitle", { number: quotationNumber })}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="flex flex-col gap-5">
          {/* Client */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light">
              <User02Icon /> {t("clients.infoTitle")}
            </h3>
            <div className="form-group">
              <label className="form-label">{t("invoiceForm.chooseClient")}</label>
              <select
                className="form-input form-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">{t("invoiceForm.chooseClientPlaceholder")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.company}
                  </option>
                ))}
              </select>
            </div>
            {client && (
              <div className="flex items-center gap-3.5 p-3.5 bg-bg-secondary rounded-md mt-2">
                <div className="w-[42px] h-[42px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {client.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)}
                </div>
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-xs text-text-tertiary">
                    {client.email}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light">
              <PackageIcon /> {t("invoiceForm.itemServices")}
            </h3>
            {items.map((item, index) => (
              <div
                key={item.id}
                className="border border-border-light rounded-md p-4 mb-3 bg-bg-secondary hover:border-red-200 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/50 px-2.5 py-0.5 rounded-full">
                    #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-bg text-danger text-xs cursor-pointer hover:bg-danger hover:text-white transition-all"
                      onClick={() => removeItem(item.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">{t("common.description")}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t("invoiceForm.exampleItem")}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t("invoiceForm.quantity")}</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {t("invoiceDetail.price")} ({currency})
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "price",
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>
                <div className="text-right text-sm text-text-secondary pt-2 border-t border-dashed border-border-color mt-2">
                  Subtotal:{" "}
                  <strong className="text-text-primary">
                    {formatCurrency(item.quantity * item.price, currency)}
                  </strong>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary w-full mt-1" onClick={addItem}>
              ＋ {t("invoiceForm.addItem")}
            </button>
          </div>

          {/* Details */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light">
              <GoogleDocIcon /> {t("invoiceForm.additionalDetails")}
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t("invoiceForm.taxPercent")}</label>
                <input
                  type="number"
                  className="form-input"
                  value={tax}
                  onChange={(e) => setTax(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("invoiceForm.discountAmount")}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t("common.currency")}</label>
              <CurrencySelect
                value={currency}
                onChange={setCurrency}
                allowedCurrencies={ALL_SUPPORTED_CURRENCIES}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("quotationForm.validUntil")}</label>
              <input
                type="date"
                className="form-input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("clients.notes")}</label>
              <textarea
                className="form-input form-textarea"
                placeholder={t("invoiceForm.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card p-7">
            <div
              className={`flex justify-between items-start mb-6 pb-5 border-b-2 ${!accentColor ? "border-red-500" : ""}`}
              style={accentColor ? { borderBottomColor: accentColor } : {}}
            >
              <div>
                <div
                  className={`w-10 h-10 rounded-sm flex items-center justify-center font-extrabold text-sm text-white mb-2 ${!accentColor ? "bg-gradient-to-br from-red-600 to-red-500" : ""}`}
                  style={
                    accentColor ? { backgroundColor: accentColor } : undefined
                  }
                >
                  {companyInitial || "IQ"}
                </div>
                <h2
                  className={`text-2xl font-black tracking-[2px] ${!accentColor ? "bg-gradient-to-br from-red-600 to-red-500" : ""} bg-clip-text text-transparent`}
                  style={accentColor ? { backgroundColor: accentColor } : {}}
                >
                  {t("quotationForm.documentTitle")}
                </h2>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm mb-1">{quotationNumber}</div>
                <div className="text-xs text-text-secondary">
                  {t("dashboard.date")}:{" "}
                  {new Date().toLocaleDateString(intlLocale)}
                </div>
                {validUntil && (
                  <div className="text-xs text-text-secondary">
                    {t("quotationForm.validUntil")}:{" "}
                    {new Date(validUntil).toLocaleDateString(intlLocale)}
                  </div>
                )}
              </div>
            </div>

            {client && (
              <div className="mb-5 p-3 bg-bg-secondary rounded-md">
                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                  {t("quotationForm.offerFor")}
                </div>
                <div className="font-semibold">{client.name}</div>
                <div className="text-xs text-text-tertiary">{client.email}</div>
              </div>
            )}

            <div className="mb-5">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">
                      {t("common.description")}
                    </th>
                    <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">
                      {t("invoiceDetail.quantity")}
                    </th>
                    <th className="py-2 px-2.5 text-right text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">
                      {t("invoices.totalValue")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) => i.description)
                    .map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 text-[13px] border-b border-border-light">
                          {item.description}
                        </td>
                        <td className="py-2 px-2.5 text-[13px] border-b border-border-light">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2.5 text-[13px] border-b border-border-light text-right">
                          {formatCurrency(item.quantity * item.price, currency)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="py-4 border-t border-border-color">
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                <span>{t("invoiceDetail.tax")} ({tax}%)</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                  <span>{t("invoiceDetail.discount")}</span>
                  <span className="text-success">
                    -{formatCurrency(discount, currency)}
                  </span>
                </div>
              )}
              <div
                className={`flex justify-between text-lg font-extrabold pt-3 mt-2 border-t-2 ${!accentColor ? "border-red-500" : ""}`}
                style={accentColor ? { borderTopColor: accentColor } : {}}
              >
                <span>{t("invoices.totalValue")}</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? t("common.saving") : t("common.saveChanges")}
              </button>
              <Link
                href={`/quotations/${quotationId}`}
                className="btn btn-secondary w-full text-center"
              >
                {t("common.cancel")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
