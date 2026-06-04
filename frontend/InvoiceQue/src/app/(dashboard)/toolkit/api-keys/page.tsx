"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiKeyApi } from "@/lib/api";
import type { ApiKey } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  CodeIcon,
  Add01Icon,
  Cancel01Icon,
  Tick01Icon,
  Delete02Icon,
  Loading03Icon,
  Link01Icon,
  ArrowUpRight01Icon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";

// ── Scope categories for the UI ──
const SCOPE_CATEGORIES = [
  {
    label: "Tasks & Projects",
    scopes: ["tasks:read", "tasks:write", "projects:read", "projects:write"],
  },
  {
    label: "Time Tracking",
    scopes: ["time:read", "time:write"],
  },
  {
    label: "Invoicing & Billing",
    scopes: ["invoices:read", "invoices:write"],
  },
  {
    label: "Clients & CRM",
    scopes: ["clients:read", "clients:write"],
  },
  {
    label: "Expenses",
    scopes: ["expenses:read", "expenses:write"],
  },
  {
    label: "Meetings",
    scopes: ["meetings:read", "meetings:write"],
  },
  {
    label: "Toolkit",
    scopes: ["toolkit:read", "toolkit:write"],
  },
  {
    label: "Other",
    scopes: ["profile:read", "notifications:read"],
  },
];

function scopeLabel(scope: string) {
  return scope
    .replace(":", " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ApiKeysPage() {
  const { t } = useLanguage();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Newly created key (shown once in success modal)
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);

  // Revoke confirmation modal state
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Date Formatter matching user locale
  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }, []);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiKeyApi.list();
      setKeys(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const selectAllScopes = () => {
    const all = SCOPE_CATEGORIES.flatMap((c) => c.scopes);
    setSelectedScopes(all);
  };

  const clearAllScopes = () => {
    setSelectedScopes([]);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await apiKeyApi.create(
        newName.trim(),
        selectedScopes.length > 0 ? selectedScopes : undefined,
      );
      setNewKey(res.data.key);
      setNewName("");
      setSelectedScopes([]);
      setShowCreate(false);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    setRevoking(true);
    try {
      await apiKeyApi.revoke(revokeId);
      setRevokeId(null);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy method
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header matching designer tools */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/toolkit"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors shrink-0"
          >
            <ArrowLeft01Icon width={20} height={20} />
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <CodeIcon
                width={22}
                height={22}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("apiKeys.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("apiKeys.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Create API Key button */}
        <button
          className="btn btn-primary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
          onClick={() => {
            setNewName("");
            setSelectedScopes([]);
            setShowCreate(true);
          }}
        >
          <Add01Icon width={16} height={16} />
          {t("apiKeys.create")}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-bold text-lg leading-none hover:opacity-80">×</button>
        </div>
      )}

      {/* Main Grid: Left is active keys card list, Right is Integration Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Keys Management */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-bg-card rounded-2xl border border-border-color p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                {t("apiKeys.activeKeys")}
                <span className="text-xs font-semibold text-text-tertiary bg-bg-secondary px-2.5 py-0.5 rounded-full border border-border-light">
                  {activeKeys.length} / 5
                </span>
              </h3>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-text-tertiary text-sm gap-2">
                <Loading03Icon className="animate-spin text-blue-500" width={24} height={24} />
                <span>{t("apiKeys.loading")}</span>
              </div>
            ) : activeKeys.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/10 text-blue-500 flex items-center justify-center mb-3">
                  <CodeIcon width={28} height={28} />
                </div>
                <h4 className="font-bold text-text-primary text-sm mb-1">
                  {t("apiKeys.emptyTitle")}
                </h4>
                <p className="text-xs text-text-tertiary max-w-sm mb-5">
                  {t("apiKeys.emptyDesc")}
                </p>
                <button
                  className="btn btn-secondary text-xs flex items-center gap-1.5"
                  onClick={() => setShowCreate(true)}
                >
                  <Add01Icon width={14} height={14} />
                  {t("apiKeys.create")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {activeKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-bg-secondary rounded-2xl border border-border-color p-5 flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-text-primary truncate" title={key.name}>
                            {key.name}
                          </h4>
                        </div>

                        <button
                          onClick={() => setRevokeId(key.id)}
                          className="text-xs font-semibold text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 bg-transparent hover:bg-red-500 px-2.5 py-1 rounded-lg transition-all shadow-sm shrink-0"
                        >
                          {t("apiKeys.revoke")}
                        </button>
                      </div>
                      <code className="inline-block mt-1 px-2 py-0.5 bg-bg-primary rounded text-[11px] font-mono text-text-secondary border border-border-light w-full">
                        {key.key_prefix}••••••••••••
                      </code>

                      {/* Scopes list */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(key.scopes || []).slice(0, 4).map((scope) => (
                          <span
                            key={scope}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10"
                          >
                            {scope}
                          </span>
                        ))}
                        {(key.scopes || []).length > 4 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-text-tertiary bg-bg-primary border border-border-light">
                            +{(key.scopes || []).length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-text-tertiary border-t border-border-light pt-3 mt-4">
                      <div className="flex justify-between">
                        <span>{t("apiKeys.created")}</span>
                        <span className="font-mono text-text-secondary">{formatDate(key.created_at)}</span>
                      </div>
                      {key.last_used_at && (
                        <div className="flex justify-between">
                          <span>{t("apiKeys.lastUsed")}</span>
                          <span className="font-mono text-text-secondary">{formatDate(key.last_used_at)}</span>
                        </div>
                      )}
                      {key.expires_at && (
                        <div className="flex justify-between">
                          <span>{t("apiKeys.expires")}</span>
                          <span className="font-mono text-text-secondary">{formatDate(key.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revoked Keys list if any */}
          {revokedKeys.length > 0 && (
            <div className="bg-bg-card rounded-2xl border border-border-color p-5 opacity-60">
              <h3 className="font-bold text-xs text-text-tertiary mb-3 flex items-center gap-2 uppercase tracking-wider">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" />
                </svg>
                {t("apiKeys.revokedKeys")} ({revokedKeys.length})
              </h3>
              <div className="flex flex-col gap-2">
                {revokedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="p-3.5 rounded-xl border border-border-light bg-bg-secondary/40 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-text-tertiary line-through truncate block">
                        {key.name}
                      </span>
                      <code className="text-[10px] text-text-tertiary font-mono">
                        {key.key_prefix}••••
                      </code>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20 uppercase">
                      revoked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Developer Integration Hub */}
        <div className="lg:col-span-1">
          <IntegrationHub copyFn={copyToClipboard} copied={copied} t={t} />
        </div>
      </div>

      {/* CREATE NEW API KEY MODAL (PORTAL) */}
      {showCreate && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setShowCreate(false)}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[600px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-base font-bold flex items-center gap-2 text-text-primary">
                  <CodeIcon width={18} height={18} className="text-blue-500" />
                  {t("apiKeys.form.title")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover transition-colors"
                  onClick={() => setShowCreate(false)}
                >
                  <Cancel01Icon width={18} height={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                {/* Form Group Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary">
                    {t("apiKeys.form.keyName")}
                  </label>
                  <input
                    type="text"
                    className="form-input text-sm"
                    placeholder={t("apiKeys.form.keyNamePlaceholder")}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={100}
                    autoFocus
                  />
                  <p className="text-[11px] text-text-tertiary">
                    {t("apiKeys.form.keyNameHint")}
                  </p>
                </div>

                {/* Form Group Scopes */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-secondary">
                      {t("apiKeys.form.permissions")}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllScopes}
                        className="text-[11px] text-blue-500 hover:underline font-semibold"
                      >
                        {t("apiKeys.form.selectAll")}
                      </button>
                      <span className="text-[11px] text-text-tertiary">|</span>
                      <button
                        type="button"
                        onClick={clearAllScopes}
                        className="text-[11px] text-text-tertiary hover:underline font-semibold"
                      >
                        {t("apiKeys.form.clear")}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    {t("apiKeys.form.permissionsHint")}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {SCOPE_CATEGORIES.map((cat) => (
                      <div
                        key={cat.label}
                        className="p-3 rounded-xl border border-border-light bg-bg-secondary/50 flex flex-col gap-2"
                      >
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                          {cat.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.scopes.map((scope) => {
                            const selected = selectedScopes.includes(scope);
                            return (
                              <button
                                key={scope}
                                type="button"
                                onClick={() => toggleScope(scope)}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all border ${
                                  selected
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                                    : "bg-bg-primary border-border-light text-text-tertiary hover:border-border-color"
                                }`}
                              >
                                {scope.split(":")[1] === "read" ? "👁" : "✏️"}{" "}
                                {scopeLabel(scope)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border-light flex items-center justify-end gap-3 shrink-0">
                <button
                  className="btn btn-secondary text-xs px-4"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary text-xs px-4 flex items-center gap-1.5"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating && <Loading03Icon className="animate-spin" width={14} height={14} />}
                  {t("apiKeys.create")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* SUCCESS MODAL FOR THE GENERATED KEY (PORTAL) */}
      {newKey && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-5">
            <div className="bg-bg-card rounded-2xl w-full max-w-[500px] border border-border-color shadow-2xl overflow-hidden animate-fade-in flex flex-col">
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Tick01Icon width={24} height={24} />
                </div>
                <h3 className="text-base font-bold text-text-primary m-0">
                  {t("apiKeys.success.title")}
                </h3>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed max-w-sm">
                  {t("apiKeys.success.desc")}
                </p>

                {/* Key block */}
                <div className="w-full mt-4 flex items-center gap-2 p-3 bg-bg-secondary rounded-xl border border-border-light">
                  <code className="flex-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 break-all select-all text-left max-h-[60px] overflow-y-auto">
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="px-6 py-4 border-t border-border-light flex justify-end">
                <button
                  className="btn btn-primary text-xs px-5"
                  onClick={() => setNewKey("")}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* CONFIRM REVOKE MODAL */}
      <ConfirmModal
        isOpen={!!revokeId}
        title={t("apiKeys.revoke")}
        message={t("apiKeys.revokeConfirm")}
        confirmText={t("apiKeys.revoke")}
        cancelText={t("common.cancel")}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeId(null)}
        isLoading={revoking}
        type="danger"
      />
    </div>
  );
}

// ── API Endpoints for reference ──
const API_ENDPOINTS = [
  { method: "GET", path: "/tasks", scope: "tasks:read", desc: "Daftar semua tasks" },
  { method: "POST", path: "/tasks", scope: "tasks:write", desc: "Buat task baru" },
  { method: "GET", path: "/projects", scope: "projects:read", desc: "Daftar projects" },
  { method: "GET", path: "/time-entries", scope: "time:read", desc: "Daftar time entries" },
  { method: "POST", path: "/time-entries/start", scope: "time:write", desc: "Mulai tracking" },
  { method: "POST", path: "/time-entries/stop", scope: "time:write", desc: "Stop tracking" },
  { method: "GET", path: "/clients", scope: "clients:read", desc: "Daftar clients" },
  { method: "GET", path: "/invoices", scope: "invoices:read", desc: "Daftar invoices" },
  { method: "GET", path: "/profile", scope: "profile:read", desc: "Profil user" },
];

interface IntegrationHubProps {
  copyFn: (t: string) => void;
  copied: boolean;
  t: any;
}

function IntegrationHub({ copyFn, copied, t }: IntegrationHubProps) {
  const [activeTab, setActiveTab] = useState("vscode");
  const [showEndpoints, setShowEndpoints] = useState(false);

  const snippets: Record<
    string,
    { label: string; desc: string; icon: string; steps: string[] }
  > = {
    vscode: {
      label: t("apiKeys.hub.vscode.label"),
      desc: t("apiKeys.hub.vscode.desc"),
      icon: "💻",
      
      steps: [
        t("apiKeys.hub.vscode.step1"),
        t("apiKeys.hub.vscode.step2"),
        t("apiKeys.hub.vscode.step3"),
      ],
    },
    antigravity: {
      label: t("apiKeys.hub.antigravity.label"),
      desc: t("apiKeys.hub.antigravity.desc"),
      icon: "🚀",
      
      steps: [
        t("apiKeys.hub.antigravity.step1"),
        t("apiKeys.hub.antigravity.step2"),
        t("apiKeys.hub.antigravity.step3"),
      ],
    },
  };

  const currentSnippet = snippets[activeTab] || snippets.vscode;

  return (
    <div className="bg-bg-card rounded-2xl border border-border-color p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          {t("apiKeys.hub.title")}
        </h3>
        <p className="text-xs text-text-tertiary mt-1">
          {t("apiKeys.hub.subtitle")}
        </p>
      </div>

      {/* Language/Integration Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 shrink-0">
        {Object.entries(snippets).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTab === key
                ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                : "bg-transparent border-border-light text-text-tertiary hover:border-border-color hover:text-text-secondary"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <p className="text-xs text-text-secondary leading-relaxed bg-bg-secondary p-3 rounded-xl border border-border-light">
        {currentSnippet.desc}
      </p>

      {/* Steps List */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-bold text-text-primary">Langkah Integrasi / Integration Steps:</h4>
        <ul className="text-xs text-text-secondary list-disc pl-4 space-y-1.5">
          {currentSnippet.steps.map((step, idx) => (
            <li key={idx} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* Auth Format Info Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-blue-500/10">
        <div className="flex items-start gap-2.5">
          <span className="text-blue-500 mt-0.5 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary">{t("apiKeys.hub.format")}</p>
            <code className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 break-all">
              Authorization: ApiKey iq_live_xxxxxxxxxxxxx
            </code>
            <p className="text-[10px] text-text-tertiary mt-1.5 leading-relaxed">
              {t("apiKeys.hub.formatHint")}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Endpoints Section */}
      <div className="border-t border-border-light pt-3">
        <button
          onClick={() => setShowEndpoints(!showEndpoints)}
          className="flex items-center justify-between text-xs font-bold text-text-secondary hover:text-text-primary transition-colors w-full"
        >
          <div className="flex items-center gap-1.5">
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${showEndpoints ? "rotate-90" : ""}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span>API Endpoints Reference</span>
          </div>
          <span className="text-[10px] font-medium text-text-tertiary bg-bg-secondary px-2 py-0.5 rounded-full border border-border-light">
            {API_ENDPOINTS.length}
          </span>
        </button>

        {showEndpoints && (
          <div className="mt-3 border border-border-light rounded-xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border-light">
                    <th className="px-3 py-2 font-bold text-text-secondary">Method</th>
                    <th className="px-3 py-2 font-bold text-text-secondary">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {API_ENDPOINTS.map((ep, i) => (
                    <tr key={i} className="border-b border-border-light last:border-0 hover:bg-bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          ep.method === "GET"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400 truncate max-w-[120px]" title={ep.path}>
                        {ep.path}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
