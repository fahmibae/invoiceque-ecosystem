"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiKeyApi } from "@/lib/api";
import type { ApiKey } from "@/lib/api";
import Link from "next/link";

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

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function scopeLabel(scope: string) {
  return scope
    .replace(":", " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Newly created key (shown once)
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);

  // Revoke confirmation
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

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

  const handleRevoke = async (id: string) => {
    setRevoking(true);
    try {
      await apiKeyApi.revoke(id);
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
      // Fallback
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="page-title">API Keys</h1>
          </div>
          <p className="page-subtitle">
            Kelola API keys untuk integrasi eksternal seperti VS Code, CI/CD, atau aplikasi pihak ketiga.
          </p>
        </div>
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => {
            setShowCreate(true);
            setNewKey("");
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          Create API Key
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          {error}
          <button onClick={() => setError("")} className="float-right font-bold">×</button>
        </div>
      )}

      {/* New key reveal banner */}
      {newKey && (
        <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-1">
                API Key berhasil dibuat!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">
                Simpan key ini di tempat aman. Key tidak akan ditampilkan lagi setelah Anda menutup pesan ini.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white/80 dark:bg-black/20 rounded-lg text-xs font-mono text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/20 overflow-x-auto">
                  {newKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all"
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKey("")}
              className="shrink-0 text-emerald-500 hover:text-emerald-700 dark:text-emerald-400"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" /><path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Create API Key Form */}
      {showCreate && (
        <div className="card mb-5 border-2 border-dashed border-border-color">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            Create New API Key
          </h3>

          <div className="form-group mb-4">
            <label className="form-label">Key Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., VS Code Extension, CI/CD Pipeline, Zapier"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-text-tertiary mt-1">
              Nama deskriptif untuk mengidentifikasi key ini.
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Permissions (Scopes)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllScopes}
                  className="text-xs text-blue-500 hover:text-blue-700 font-semibold"
                >
                  Select All
                </button>
                <span className="text-xs text-text-tertiary">|</span>
                <button
                  type="button"
                  onClick={clearAllScopes}
                  className="text-xs text-text-tertiary hover:text-text-primary font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="text-xs text-text-tertiary mb-3">
              Kosongkan untuk default scopes (tasks, time, projects, profile).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCOPE_CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="p-3 rounded-lg border border-border-light bg-bg-main/50"
                >
                  <div className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">
                    {cat.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.scopes.map((scope) => {
                      const selected = selectedScopes.includes(scope);
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope)}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                            selected
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                              : "bg-transparent border-border-light text-text-tertiary hover:border-border-color"
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

          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Creating...
                </span>
              ) : (
                "Create API Key"
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
                setSelectedScopes([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Keys */}
      <div className="card mb-5">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          Active Keys
          <span className="text-xs font-medium text-text-tertiary bg-bg-main px-2 py-0.5 rounded-full">
            {activeKeys.length} / 5
          </span>
        </h3>

        {loading ? (
          <div className="py-8 text-center text-text-tertiary text-sm">
            <span className="animate-spin inline-block mr-2">⏳</span>
            Loading API keys...
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-bg-main flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary font-medium mb-1">
              Belum ada API key
            </p>
            <p className="text-xs text-text-tertiary">
              Buat API key untuk mengintegrasikan InvoiceQu dengan aplikasi lain.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 rounded-lg border border-border-light hover:border-border-color transition-colors bg-bg-main/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{key.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>
                    <code className="text-xs text-text-tertiary font-mono">
                      {key.key_prefix}••••••••••••
                    </code>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(key.scopes || []).slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/5 text-blue-500 dark:text-blue-400 border border-blue-500/10"
                        >
                          {s}
                        </span>
                      ))}
                      {(key.scopes || []).length > 6 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-text-tertiary">
                          +{key.scopes.length - 6} more
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] text-text-tertiary">
                      <span>Created: {formatDate(key.created_at)}</span>
                      {key.last_used_at && (
                        <span>Last used: {formatDate(key.last_used_at)}</span>
                      )}
                      {key.expires_at && (
                        <span>Expires: {formatDate(key.expires_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {revokeId === key.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 font-medium">Revoke?</span>
                        <button
                          onClick={() => handleRevoke(key.id)}
                          disabled={revoking}
                          className="px-2 py-1 rounded text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          {revoking ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setRevokeId(null)}
                          className="px-2 py-1 rounded text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevokeId(key.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/20"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div className="card mb-5 opacity-60">
          <h3 className="font-bold text-sm mb-3 text-text-tertiary flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6" /><path d="M9 9l6 6" />
            </svg>
            Revoked Keys ({revokedKeys.length})
          </h3>
          <div className="flex flex-col gap-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="p-3 rounded-lg border border-border-light bg-bg-main/20 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm text-text-tertiary line-through">{key.name}</span>
                  <code className="text-xs text-text-tertiary font-mono ml-2">
                    {key.key_prefix}••••
                  </code>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                  REVOKED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Developer Integration Hub */}
      <IntegrationHub copyFn={copyToClipboard} copied={copied} />
    </div>
  );
}

// ── Code Snippets ──
const SNIPPETS: Record<string, { label: string; lang: string; icon: string; code: string }> = {
  curl: {
    label: "cURL",
    lang: "bash",
    icon: "⌨️",
    code: `# List your tasks
curl -s -H "Authorization: ApiKey YOUR_API_KEY" \\
  https://api.invoicequ.my.id/api/v1/tasks | jq

# Start time tracking
curl -X POST -H "Authorization: ApiKey YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"task_id":"TASK_UUID","description":"Coding session"}' \\
  https://api.invoicequ.my.id/api/v1/time-entries/start

# Stop time tracking
curl -X POST -H "Authorization: ApiKey YOUR_API_KEY" \\
  https://api.invoicequ.my.id/api/v1/time-entries/stop`,
  },
  javascript: {
    label: "JavaScript / TypeScript",
    lang: "typescript",
    icon: "🟨",
    code: `const API_KEY = "iq_live_your_key_here";
const BASE = "https://api.invoicequ.my.id/api/v1";

const headers = {
  "Authorization": \`ApiKey \${API_KEY}\`,
  "Content-Type": "application/json",
};

// Fetch tasks
const tasks = await fetch(\`\${BASE}/tasks\`, { headers })
  .then(r => r.json());
console.log(tasks.data);

// Start time tracking
await fetch(\`\${BASE}/time-entries/start\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    task_id: "TASK_UUID",
    description: "Working on feature",
  }),
});`,
  },
  python: {
    label: "Python",
    lang: "python",
    icon: "🐍",
    code: `import requests

API_KEY = "iq_live_your_key_here"
BASE = "https://api.invoicequ.my.id/api/v1"
headers = {"Authorization": f"ApiKey {API_KEY}"}

# Fetch tasks
tasks = requests.get(f"{BASE}/tasks", headers=headers).json()
print(tasks["data"])

# Start time tracking
requests.post(f"{BASE}/time-entries/start", headers=headers, json={
    "task_id": "TASK_UUID",
    "description": "Working on feature",
})

# List clients
clients = requests.get(f"{BASE}/clients", headers=headers).json()
print(clients["data"])`,
  },
  vscode: {
    label: "VS Code Settings",
    lang: "json",
    icon: "💻",
    code: `// Add to .vscode/settings.json for REST Client extension
{
  "rest-client.environmentVariables": {
    "invoicequ": {
      "apiKey": "iq_live_your_key_here",
      "baseUrl": "https://api.invoicequ.my.id/api/v1"
    }
  }
}

// Then create a .http file:
// GET {{baseUrl}}/tasks
// Authorization: ApiKey {{apiKey}}
//
// ###
// GET {{baseUrl}}/time-entries
// Authorization: ApiKey {{apiKey}}`,
  },
};

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

function IntegrationHub({ copyFn, copied }: { copyFn: (t: string) => void; copied: boolean }) {
  const [activeTab, setActiveTab] = React.useState("curl");
  const [showEndpoints, setShowEndpoints] = React.useState(false);
  const snippet = SNIPPETS[activeTab];

  return (
    <div className="card">
      <h3 className="font-bold text-base mb-1 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        Developer Integration Hub
      </h3>
      <p className="text-xs text-text-tertiary mb-4">
        Copy-paste kode di bawah untuk mengintegrasikan InvoiceQu ke aplikasi, script, atau editor Anda.
      </p>

      {/* Language Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {Object.entries(SNIPPETS).map(([key, s]) => (
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

      {/* Code Block */}
      <div className="relative group">
        <pre className="p-4 rounded-xl bg-[#1e1e2e] text-[#cdd6f4] text-xs font-mono overflow-x-auto leading-relaxed border border-[#313244]">
          <code>{snippet.code}</code>
        </pre>
        <button
          onClick={() => copyFn(snippet.code)}
          className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[11px] font-semibold transition-all opacity-0 group-hover:opacity-100"
        >
          {copied ? "✓ Copied!" : "📋 Copy"}
        </button>
      </div>

      {/* Auth Header Info */}
      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-blue-500/10">
        <div className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-text-primary">Format Autentikasi</p>
            <code className="text-[11px] font-mono text-blue-500 dark:text-blue-400">
              Authorization: ApiKey iq_live_xxxxxxxxxxxxx
            </code>
            <p className="text-[11px] text-text-tertiary mt-1">
              Ganti <code className="font-mono bg-bg-main px-1 rounded">YOUR_API_KEY</code> dengan API key yang sudah dibuat di atas. Jangan share key Anda ke pihak lain.
            </p>
          </div>
        </div>
      </div>

      {/* API Endpoints Reference */}
      <div className="mt-4">
        <button
          onClick={() => setShowEndpoints(!showEndpoints)}
          className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors w-full"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${showEndpoints ? "rotate-90" : ""}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          API Endpoints Reference
          <span className="text-[10px] font-medium text-text-tertiary bg-bg-main px-2 py-0.5 rounded-full">
            {API_ENDPOINTS.length} endpoints
          </span>
        </button>

        {showEndpoints && (
          <div className="mt-3 border border-border-light rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-bg-main/50 border-b border-border-light">
                    <th className="px-3 py-2 text-left font-bold text-text-secondary">Method</th>
                    <th className="px-3 py-2 text-left font-bold text-text-secondary">Endpoint</th>
                    <th className="px-3 py-2 text-left font-bold text-text-secondary">Scope</th>
                    <th className="px-3 py-2 text-left font-bold text-text-secondary">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {API_ENDPOINTS.map((ep, i) => (
                    <tr key={i} className="border-b border-border-light last:border-0 hover:bg-bg-main/30 transition-colors">
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ep.method === "GET"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-blue-500 dark:text-blue-400">/api/v1{ep.path}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/5 text-purple-500 border border-purple-500/10">
                          {ep.scope}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-tertiary">{ep.desc}</td>
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
