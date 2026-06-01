"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
  Delete02Icon,
  MoreVerticalIcon,
  Loading03Icon,
  ArrowLeft01Icon,
  GoogleDocIcon,
  Copy01Icon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import PremiumGate from "@/components/subscription/PremiumGate";
import { toolkitApi, ToolkitItem } from "@/lib/api";

interface BriefSection {
  heading: string;
  body: string;
}
interface BriefContent {
  client_name: string;
  objective: string;
  target_audience: string;
  tone: string;
  word_count: number;
  deadline: string;
  sections: BriefSection[];
  notes: string;
}

const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Friendly",
  "Formal",
  "Persuasive",
  "Informative",
  "Creative",
  "Authoritative",
];

const BRIEF_TEMPLATES = [
  {
    name: "Blog Post",
    objective: "Write an engaging blog post",
    word_count: 1500,
    sections: [
      { heading: "Introduction", body: "" },
      { heading: "Main Points", body: "" },
      { heading: "Supporting Evidence", body: "" },
      { heading: "Conclusion & CTA", body: "" },
    ],
  },
  {
    name: "Social Media",
    objective: "Create social media content",
    word_count: 300,
    sections: [
      { heading: "Hook", body: "" },
      { heading: "Value Proposition", body: "" },
      { heading: "Call to Action", body: "" },
    ],
  },
  {
    name: "Landing Page",
    objective: "Write landing page copy",
    word_count: 800,
    sections: [
      { heading: "Hero Section", body: "" },
      { heading: "Benefits", body: "" },
      { heading: "Social Proof", body: "" },
      { heading: "CTA Section", body: "" },
    ],
  },
];

export default function BriefsPage() {
  return (
    <PremiumGate feature="toolkit_briefs">
      <BriefsContent />
    </PremiumGate>
  );
}

function BriefsContent() {
  const { t } = useLanguage();
  const [briefs, setBriefs] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    objective: "",
    target_audience: "",
    tone: "Professional",
    word_count: 1000,
    deadline: "",
    sections: [{ heading: "", body: "" }] as BriefSection[],
    notes: "",
    tags: "",
  });

  const fetchBriefs = useCallback(async () => {
    const res = await toolkitApi.list({
      type: "brief",
      search: search || undefined,
    });
    return (res.data || []).filter(
      (item) => (item.content?.form_type as string) !== "intake_form",
    );
  }, [search]);

  const refreshBriefs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBriefs();
      setBriefs(data);
    } catch {
      /* error */
    }
    setLoading(false);
  }, [fetchBriefs]);

  useEffect(() => {
    let cancelled = false;

    fetchBriefs()
      .then((data) => {
        if (!cancelled) setBriefs(data);
      })
      .catch(() => {
        /* error */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchBriefs]);

  const resetForm = () => {
    setForm({
      title: "",
      client_name: "",
      objective: "",
      target_audience: "",
      tone: "Professional",
      word_count: 1000,
      deadline: "",
      sections: [{ heading: "", body: "" }],
      notes: "",
      tags: "",
    });
    setEditingId(null);
  };

  const openEdit = (item: ToolkitItem) => {
    const c = item.content as unknown as BriefContent;
    setEditingId(item.id);
    setForm({
      title: item.title,
      client_name: c?.client_name || "",
      objective: c?.objective || "",
      target_audience: c?.target_audience || "",
      tone: c?.tone || "Professional",
      word_count: c?.word_count || 1000,
      deadline: c?.deadline || "",
      sections: c?.sections?.length ? c.sections : [{ heading: "", body: "" }],
      notes: c?.notes || "",
      tags: (item.tags || []).join(", "),
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        toolkit_type: "brief" as const,
        title: form.title,
        content: {
          client_name: form.client_name,
          objective: form.objective,
          target_audience: form.target_audience,
          tone: form.tone,
          word_count: form.word_count,
          deadline: form.deadline,
          sections: form.sections.filter((s) => s.heading.trim()),
          notes: form.notes,
        },
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (editingId) await toolkitApi.update(editingId, payload);
      else await toolkitApi.create(payload);
      setShowModal(false);
      resetForm();
      void refreshBriefs();
    } catch {
      /* error */
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      void refreshBriefs();
    } catch {
      /* */
    }
  };

  const loadTemplate = (t: (typeof BRIEF_TEMPLATES)[0]) => {
    setForm((f) => ({
      ...f,
      title: f.title || t.name + " Brief",
      objective: t.objective,
      word_count: t.word_count,
      sections: t.sections,
    }));
  };

  const addSection = () =>
    setForm((f) => ({
      ...f,
      sections: [...f.sections, { heading: "", body: "" }],
    }));
  const removeSection = (idx: number) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.filter((_, i) => i !== idx),
    }));
  const updateSection = (
    idx: number,
    field: "heading" | "body",
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const duplicateBrief = async (item: ToolkitItem) => {
    try {
      const c = item.content as unknown as BriefContent;
      await toolkitApi.create({
        toolkit_type: "brief",
        title: `${item.title} (${t("common.copySuffix")})`,
        content: c as unknown as Record<string, unknown>,
        tags: item.tags || [],
      });
      void refreshBriefs();
    } catch {
      /* */
    }
    setMenuOpen(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/toolkit"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors shrink-0"
          >
            <ArrowLeft01Icon width={20} height={20} />
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <GoogleDocIcon
                width={22}
                height={22}
                className="text-amber-600"
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("briefs.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("briefs.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          className="btn btn-primary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Add01Icon width={16} height={16} />
          {t("briefs.create")}
        </button>
      </div>

      <div className="relative mb-6">
        <Search01Icon
          width={16}
          height={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder={t("briefs.searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLoading(true);
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-color bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loading03Icon
            width={32}
            height={32}
            className="animate-spin text-amber-500"
          />
        </div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary rounded-2xl border border-border-color">
          <GoogleDocIcon
            width={48}
            height={48}
            className="mx-auto mb-4 opacity-30"
          />
          <p className="text-text-tertiary mb-4">
            {t("briefs.emptyTitle")}
          </p>
          <button
            className="btn btn-primary text-sm"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Add01Icon width={16} height={16} /> {t("briefs.create")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => {
            const c = brief.content as unknown as BriefContent;
            const isExpanded = expandedBrief === brief.id;
            return (
              <div
                key={brief.id}
                className="bg-bg-secondary rounded-2xl border border-border-color overflow-hidden hover:shadow-md transition-all"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedBrief(isExpanded ? null : brief.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm text-text-primary">
                          {brief.title}
                        </h3>
                        {c?.client_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            {c.client_name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
                        {c?.tone && <span>🎯 {c.tone}</span>}
                        {c?.word_count && (
                          <span>📝 {t("briefs.words", { count: c.word_count })}</span>
                        )}
                        {c?.deadline && <span>📅 {c.deadline}</span>}
                        {c?.sections && (
                          <span>
                            📋{" "}
                            {t("briefs.sectionCount", {
                              count: c.sections.length,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <button
                          className="p-1 rounded-lg hover:bg-bg-hover"
                          onClick={() =>
                            setMenuOpen(menuOpen === brief.id ? null : brief.id)
                          }
                        >
                          <MoreVerticalIcon width={14} height={14} />
                        </button>
                        {menuOpen === brief.id && (
                          <div className="absolute right-0 top-8 bg-bg-primary border border-border-color rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-hover"
                              onClick={() => openEdit(brief)}
                            >
                              ✏️ {t("common.edit")}
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-hover"
                              onClick={() => duplicateBrief(brief)}
                            >
                              <Copy01Icon width={14} height={14} />{" "}
                              {t("common.duplicate")}
                            </button>
                            <div className="border-t border-border-light my-1" />
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => {
                                setDeleteTarget(brief.id);
                                setShowDeleteModal(true);
                                setMenuOpen(null);
                              }}
                            >
                              <Delete02Icon width={14} height={14} />{" "}
                              {t("common.delete")}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {isExpanded && c?.sections && (
                  <div className="px-4 pb-4 border-t border-border-light pt-3 space-y-2">
                    {c.objective && (
                      <div className="text-xs">
                        <span className="font-semibold text-text-secondary">
                          {t("briefs.objective")}:
                        </span>{" "}
                        <span className="text-text-tertiary">
                          {c.objective}
                        </span>
                      </div>
                    )}
                    {c.target_audience && (
                      <div className="text-xs">
                        <span className="font-semibold text-text-secondary">
                          {t("briefs.targetAudience")}:
                        </span>{" "}
                        <span className="text-text-tertiary">
                          {c.target_audience}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1.5 mt-2">
                      {c.sections.map((s, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-bg-hover">
                          <h4 className="text-xs font-semibold text-text-secondary">
                            {i + 1}. {s.heading}
                          </h4>
                          {s.body && (
                            <p className="text-xs text-text-tertiary mt-1">
                              {s.body}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {c.notes && (
                      <div className="text-xs mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300">
                        💡 {c.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[640px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <GoogleDocIcon
                    width={20}
                    height={20}
                    className="text-amber-600"
                  />
                  {editingId ? t("briefs.editTitle") : t("briefs.createTitle")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                {!editingId && (
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("briefs.template")}
                    </label>
                    <div className="flex gap-2">
                      {BRIEF_TEMPLATES.map((t, i) => (
                        <button
                          key={i}
                          className="px-3 py-1.5 rounded-lg border border-border-color text-xs hover:border-amber-400 transition-colors"
                          onClick={() => loadTemplate(t)}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("common.title")} *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Blog Post Brief"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("briefs.client")}
                    </label>
                    <input
                      type="text"
                      value={form.client_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, client_name: e.target.value }))
                      }
                      placeholder="Opsional"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("briefs.objective")}
                  </label>
                  <textarea
                    value={form.objective}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, objective: e.target.value }))
                    }
                    rows={2}
                    placeholder="Tujuan konten..."
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("briefs.targetAudience")}
                  </label>
                  <input
                    type="text"
                    value={form.target_audience}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        target_audience: e.target.value,
                      }))
                    }
                    placeholder="e.g. Small business owners"
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("briefs.tone")}
                    </label>
                    <select
                      value={form.tone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tone: e.target.value }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                    >
                      {TONE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("briefs.wordCount")}
                    </label>
                    <input
                      type="number"
                      value={form.word_count}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          word_count: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("briefs.deadline")}
                    </label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, deadline: e.target.value }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                      {t("briefs.sections", { count: form.sections.length })}
                    </label>
                    <button
                      className="text-xs text-amber-600 hover:underline"
                      onClick={addSection}
                    >
                      + {t("briefs.addSection")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.sections.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border-color bg-bg-hover space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={s.heading}
                            onChange={(e) =>
                              updateSection(idx, "heading", e.target.value)
                            }
                            placeholder={`Section ${idx + 1} heading`}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-border-color bg-bg-secondary text-xs focus:outline-none"
                          />
                          {form.sections.length > 1 && (
                            <button
                              onClick={() => removeSection(idx)}
                              className="p-1 text-red-400"
                            >
                              <Cancel01Icon width={14} height={14} />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={s.body}
                          onChange={(e) =>
                            updateSection(idx, "body", e.target.value)
                          }
                          placeholder={t("briefs.instructions")}
                          rows={2}
                          className="w-full px-2 py-1.5 rounded-lg border border-border-color bg-bg-secondary text-xs focus:outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("checklists.tags")}
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tags: e.target.value }))
                    }
                    placeholder="blog, seo, client"
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  }}
                >
                  {saving ? (
                    <Loading03Icon
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Add01Icon width={16} height={16} />
                  )}
                  {saving
                    ? t("common.saving")
                    : editingId
                      ? t("common.saveChanges")
                      : t("briefs.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("briefs.deleteTitle")}
        message={t("briefs.deleteMessage")}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
