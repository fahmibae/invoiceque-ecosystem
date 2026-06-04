"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  Add01Icon,
  Delete02Icon,
  Search01Icon,
  Loading03Icon,
  Edit02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
  Copy01Icon,
  ViewIcon,
  UserAdd01Icon,
  TextIcon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import PremiumGate from "@/components/subscription/PremiumGate";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  toolkitApi,
  type ToolkitItem,
  type CreateToolkitItemRequest,
} from "@/lib/api";

const FIELD_TYPES = [
  { value: "text", label: "Text", labelKey: "fieldType.text", icon: "📝" },
  {
    value: "textarea",
    label: "Long Text",
    labelKey: "fieldType.textarea",
    icon: "📋",
  },
  { value: "email", label: "Email", labelKey: "fieldType.email", icon: "📧" },
  { value: "phone", label: "Phone", labelKey: "fieldType.phone", icon: "📞" },
  { value: "url", label: "URL", labelKey: "fieldType.url", icon: "🔗" },
  {
    value: "number",
    label: "Number",
    labelKey: "fieldType.number",
    icon: "🔢",
  },
  { value: "date", label: "Date", labelKey: "fieldType.date", icon: "📅" },
  {
    value: "select",
    label: "Dropdown",
    labelKey: "fieldType.select",
    icon: "📎",
  },
  {
    value: "checkbox",
    label: "Checkbox",
    labelKey: "fieldType.checkbox",
    icon: "☑️",
  },
  {
    value: "file",
    label: "File Upload",
    labelKey: "fieldType.file",
    icon: "📁",
  },
];

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const PRESET_TEMPLATES = [
  {
    name: "🎨 Design Project Intake",
    fields: [
      { id: "1", type: "text", label: "Nama Perusahaan", required: true },
      { id: "2", type: "text", label: "Nama PIC", required: true },
      { id: "3", type: "email", label: "Email", required: true },
      { id: "4", type: "phone", label: "No. HP / WhatsApp", required: true },
      {
        id: "5",
        type: "select",
        label: "Jenis Project",
        required: true,
        options: [
          "Logo Design",
          "Brand Identity",
          "UI/UX Design",
          "Social Media",
          "Packaging",
          "Other",
        ],
      },
      {
        id: "6",
        type: "textarea",
        label: "Brief / Deskripsi Project",
        required: true,
        placeholder: "Jelaskan kebutuhan desain Anda...",
      },
      {
        id: "7",
        type: "text",
        label: "Budget Range",
        required: false,
        placeholder: "e.g. Rp 5-10 juta",
      },
      { id: "8", type: "date", label: "Target Deadline", required: false },
      {
        id: "9",
        type: "url",
        label: "Referensi / Inspirasi (URL)",
        required: false,
      },
      {
        id: "10",
        type: "file",
        label: "Upload File Pendukung",
        required: false,
      },
    ],
  },
  {
    name: "💻 Web Development Intake",
    fields: [
      {
        id: "1",
        type: "text",
        label: "Nama Perusahaan / Personal",
        required: true,
      },
      { id: "2", type: "email", label: "Email", required: true },
      { id: "3", type: "phone", label: "No. HP / WhatsApp", required: true },
      {
        id: "4",
        type: "select",
        label: "Jenis Website",
        required: true,
        options: [
          "Landing Page",
          "Company Profile",
          "E-Commerce",
          "Web App",
          "Blog",
          "Portfolio",
          "Other",
        ],
      },
      { id: "5", type: "textarea", label: "Deskripsi Project", required: true },
      {
        id: "6",
        type: "select",
        label: "Sudah Punya Domain?",
        required: true,
        options: ["Sudah", "Belum", "Perlu Bantuan"],
      },
      {
        id: "7",
        type: "select",
        label: "Sudah Punya Hosting?",
        required: true,
        options: ["Sudah", "Belum", "Perlu Bantuan"],
      },
      { id: "8", type: "text", label: "Budget Range", required: false },
      { id: "9", type: "date", label: "Target Launch", required: false },
      { id: "10", type: "url", label: "Website Referensi", required: false },
    ],
  },
  {
    name: "📣 Marketing Campaign Intake",
    fields: [
      { id: "1", type: "text", label: "Brand / Company Name", required: true },
      { id: "2", type: "text", label: "Contact Person", required: true },
      { id: "3", type: "email", label: "Email", required: true },
      {
        id: "4",
        type: "select",
        label: "Platform",
        required: true,
        options: [
          "Instagram",
          "TikTok",
          "Facebook",
          "Google Ads",
          "LinkedIn",
          "Multi-platform",
        ],
      },
      {
        id: "5",
        type: "textarea",
        label: "Campaign Objective",
        required: true,
      },
      { id: "6", type: "text", label: "Target Audience", required: true },
      { id: "7", type: "text", label: "Monthly Ad Budget", required: false },
      { id: "8", type: "date", label: "Campaign Start Date", required: false },
    ],
  },
];

export default function IntakeFormsPage() {
  return (
    <PremiumGate feature="toolkit_intake_forms">
      <IntakeFormsContent />
    </PremiumGate>
  );
}

function IntakeFormsContent() {
  const { t } = useLanguage();
  const [forms, setForms] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<ToolkitItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form builder state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  const getForms = useCallback(async () => {
    const res = await toolkitApi.list({
      type: "brief",
      search: search || undefined,
      per_page: 50,
    });

    return (res.data || []).filter(
      (item) => (item.content?.form_type as string) === "intake_form",
    );
  }, [search]);

  const fetchForms = useCallback(async () => {
    try {
      setForms(await getForms());
    } catch {
      /* ignore */
    }
  }, [getForms]);

  useEffect(() => {
    let cancelled = false;

    getForms()
      .then((intakeForms) => {
        if (!cancelled) {
          setForms(intakeForms);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getForms]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".menu-trigger")) {
        return;
      }
      setMenuOpen(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFields([]);
    setEditingId(null);
    setShowForm(false);
    setShowPresets(false);
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: Date.now().toString(),
        type: "text",
        label: "",
        placeholder: "",
        required: false,
      },
    ]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newFields = [...fields];
    const target = index + direction;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [
      newFields[target],
      newFields[index],
    ];
    setFields(newFields);
  };

  const openEdit = (item: ToolkitItem) => {
    setTitle(item.title);
    setDescription((item.content?.description as string) || "");
    setFields((item.content?.fields as FormField[]) || []);
    setEditingId(item.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const loadPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    setTitle(preset.name.replace(/^[^\s]+\s/, ""));
    setDescription("");
    setFields(preset.fields);
    setShowPresets(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: "brief",
        title: title.trim(),
        content: {
          form_type: "intake_form",
          description,
          fields,
          field_count: fields.length,
        },
      };
      if (editingId) await toolkitApi.update(editingId, data);
      else await toolkitApi.create(data);
      resetForm();
      fetchForms();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const duplicateForm = async (item: ToolkitItem) => {
    try {
      await toolkitApi.create({
        toolkit_type: "brief",
        title: `${item.title} (${t("common.copySuffix")})`,
        content: item.content,
      });
      fetchForms();
    } catch {
      /* ignore */
    }
    setMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      fetchForms();
    } catch {
      /* ignore */
    }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon
          width={32}
          height={32}
          className="animate-spin text-amber-500"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("intake.deleteTitle")}
        message={t("intake.deleteMessage")}
        confirmText={t("common.delete")}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        type="danger"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/toolkit"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors shrink-0"
          >
            <ArrowLeft01Icon width={20} height={20} />
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shrink-0 shadow-lg shadow-amber-500/20">
              <UserAdd01Icon width={22} height={22} className="text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("intake.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("intake.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => {
              resetForm();
              setShowPresets(true);
            }}
          >
            <TextIcon width={16} height={16} /> {t("common.fromTemplate")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Add01Icon width={16} height={16} /> {t("intake.newTemplate")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full">
          <Search01Icon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder={t("intake.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
      </div>

      {/* Form List */}
      {forms.length === 0 ? (
        <div className="card p-12 text-center">
          <UserAdd01Icon
            width={48}
            height={48}
            className="mx-auto text-text-tertiary mb-3 opacity-40"
          />
          <p className="text-text-tertiary font-medium">
            {t("intake.emptyTitle")}
          </p>
          <p className="text-text-tertiary text-xs mt-1">
            {t("intake.emptySubtitle")}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowPresets(true)}
            >
              <TextIcon width={16} height={16} /> {t("common.fromTemplate")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Add01Icon width={16} height={16} /> {t("common.fromScratch")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((item) => {
            const fieldCount =
              (item.content?.field_count as number) ||
              (item.content?.fields as FormField[])?.length ||
              0;
            const formFields = (item.content?.fields as FormField[]) || [];
            const requiredCount = formFields.filter((f) => f.required).length;

            return (
              <div
                key={item.id}
                className="card p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 group relative"
              >
                <div className="absolute top-3 right-3">
                  <button
                    className={`p-1.5 rounded-lg hover:bg-bg-hover transition-colors menu-trigger ${
                      menuOpen === item.id ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === item.id ? null : item.id);
                    }}
                  >
                    <MoreVerticalIcon width={16} height={16} />
                  </button>
                  {menuOpen === item.id && (
                    <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-border-color rounded-xl shadow-lg z-50 min-w-[160px] py-1">
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => setShowPreview(item)}
                      >
                        <ViewIcon width={14} height={14} />{" "}
                        {t("common.preview")}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => openEdit(item)}
                      >
                        <Edit02Icon width={14} height={14} /> {t("common.edit")}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => duplicateForm(item)}
                      >
                        <Copy01Icon width={14} height={14} />{" "}
                        {t("common.duplicate")}
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() => {
                          setDeleteTarget(item.id);
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

                <div className="flex items-start gap-3 mb-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <UserAdd01Icon width={20} height={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-text-primary truncate pr-6">
                      {item.title}
                    </h3>
                    {(item.content?.description as string) && (
                      <p className="text-[11px] text-text-tertiary truncate">
                        {item.content.description as string}
                      </p>
                    )}
                  </div>
                </div>

                {/* Field Preview */}
                <div className="space-y-1 mb-3">
                  {formFields.slice(0, 3).map((field) => {
                    const ft = FIELD_TYPES.find((t) => t.value === field.type);
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 text-xs text-text-secondary"
                      >
                        <span className="text-[10px]">{ft?.icon || "📝"}</span>
                        <span className="truncate">{field.label}</span>
                        {field.required && (
                          <span className="text-red-400 text-[10px]">*</span>
                        )}
                      </div>
                    );
                  })}
                  {formFields.length > 3 && (
                    <p className="text-[10px] text-text-tertiary">
                      {t("intake.moreFields", {
                        count: formFields.length - 3,
                      })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-text-tertiary pt-2 border-t border-border-color/30">
                  <span>📋 {t("intake.fieldCount", { count: fieldCount })}</span>
                  <span>
                    🔴 {t("intake.requiredCount", { count: requiredCount })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preset Templates Picker */}
      {showPresets && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setShowPresets(false)}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[500px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TextIcon width={20} height={20} className="text-amber-600" />{" "}
                  {t("intake.chooseTemplate")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => setShowPresets(false)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-3">
                {PRESET_TEMPLATES.map((preset) => (
                  <button
                    key={preset.name}
                    className="w-full p-4 rounded-xl border border-border-color hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all text-left"
                    onClick={() => {
                      loadPreset(preset);
                      setShowForm(true);
                    }}
                  >
                    <div className="font-bold text-sm mb-1">{preset.name}</div>
                    <div className="text-xs text-text-tertiary">
                      {t("intake.fieldCount", {
                        count: preset.fields.length,
                      })}{" "}
                      •{" "}
                      {t("intake.requiredCount", {
                        count: preset.fields.filter((f) => f.required).length,
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Form Builder Modal */}
      {showForm && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => resetForm()}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[700px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserAdd01Icon
                    width={20}
                    height={20}
                    className="text-amber-600"
                  />
                  {editingId ? t("intake.editTitle") : t("intake.createTitle")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={resetForm}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("intake.formName")} *
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors"
                    placeholder="e.g. Web Development Client Intake"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("intake.descriptionOptional")}
                  </label>
                  <textarea
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors resize-none"
                    rows={2}
                    placeholder={t("intake.descriptionPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0">
                      {t("intake.formFields", { count: fields.length })}
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary text-xs px-3 py-1.5"
                      onClick={addField}
                    >
                      <Add01Icon width={12} height={12} />{" "}
                      {t("intake.addField")}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-3 rounded-xl border border-border-color bg-bg-secondary/30"
                      >
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-5">
                            <input
                              type="text"
                              className="w-full py-2 px-2.5 border border-border-color rounded-lg bg-bg-secondary text-xs outline-none focus:border-amber-400"
                              placeholder="Label"
                              value={field.label}
                              onChange={(e) =>
                                updateField(field.id, { label: e.target.value })
                              }
                            />
                          </div>
                          <div className="col-span-3">
                            <select
                              className="w-full py-2 px-2.5 border border-border-color rounded-lg bg-bg-secondary text-xs outline-none focus:border-amber-400"
                              value={field.type}
                              onChange={(e) =>
                                updateField(field.id, { type: e.target.value })
                              }
                            >
                              {FIELD_TYPES.map((fieldType) => (
                                <option
                                  key={fieldType.value}
                                  value={fieldType.value}
                                >
                                  {fieldType.icon}{" "}
                                  {t(fieldType.labelKey as TranslationKey)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    required: e.target.checked,
                                  })
                                }
                                className="accent-amber-500"
                              />
                              <span className="text-[10px] text-text-tertiary">
                                {t("common.requiredMark")}
                              </span>
                            </label>
                          </div>
                          <div className="col-span-2 flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              className="p-1 hover:bg-bg-hover rounded text-text-tertiary"
                              onClick={() => moveField(index, -1)}
                              disabled={index === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="p-1 hover:bg-bg-hover rounded text-text-tertiary"
                              onClick={() => moveField(index, 1)}
                              disabled={index === fields.length - 1}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-400"
                              onClick={() => removeField(field.id)}
                            >
                              <Delete02Icon width={12} height={12} />
                            </button>
                          </div>
                        </div>
                        {field.type === "select" && (
                          <div className="mt-2">
                            <input
                              type="text"
                              className="w-full py-2 px-2.5 border border-border-color rounded-lg bg-bg-secondary text-xs outline-none focus:border-amber-400"
                              placeholder={t("intake.optionPlaceholder")}
                              value={(field.options || []).join(", ")}
                              onChange={(e) =>
                                updateField(field.id, {
                                  options: e.target.value
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </div>
                        )}
                        {(field.type === "text" ||
                          field.type === "textarea") && (
                            <div className="mt-2">
                              <input
                                type="text"
                                className="w-full py-2 px-2.5 border border-border-color rounded-lg bg-bg-secondary text-xs outline-none focus:border-amber-400"
                                placeholder={t("intake.placeholderText")}
                                value={field.placeholder || ""}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    placeholder: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-center py-6 text-text-tertiary text-xs">
                        {t("intake.noFields")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={resetForm}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }}
                  disabled={saving || fields.length === 0 || !title.trim()}
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #EA580C)",
                  }}
                >
                  {saving ? (
                    <Loading03Icon
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckmarkCircle02Icon width={16} height={16} />
                  )}
                  {saving
                    ? t("common.saving")
                    : editingId
                      ? t("common.saveChanges")
                      : t("intake.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setShowPreview(null)}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[600px] sm:rounded-2xl sm:max-h-[85vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold">
                  📋 {t("intake.previewTitle", { title: showPreview.title })}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => setShowPreview(null)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5">
                {(showPreview.content?.description as string) && (
                  <p className="text-sm text-text-secondary mb-4">
                    {showPreview.content.description as string}
                  </p>
                )}
                <div className="space-y-4">
                  {((showPreview.content?.fields as FormField[]) || []).map(
                    (field) => {
                      const ft = FIELD_TYPES.find(
                        (t) => t.value === field.type,
                      );
                      return (
                        <div key={field.id}>
                          <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2 flex items-center gap-1">
                            <span>{ft?.icon}</span> {field.label}
                            {field.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm"
                              rows={3}
                              placeholder={field.placeholder || field.label}
                              disabled
                            />
                          ) : field.type === "select" ? (
                            <select
                              className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm"
                              disabled
                            >
                              <option>
                                {t("common.selectPlaceholder", {
                                  label: field.label,
                                })}
                              </option>
                              {(field.options || []).map((opt) => (
                                <option key={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === "checkbox" ? (
                            <label className="flex items-center gap-2">
                              <input type="checkbox" disabled />{" "}
                              <span className="text-sm text-text-secondary">
                                {field.label}
                              </span>
                            </label>
                          ) : (
                            <input
                              type={
                                field.type === "email"
                                  ? "email"
                                  : field.type === "number"
                                    ? "number"
                                    : field.type === "date"
                                      ? "date"
                                      : field.type === "url"
                                        ? "url"
                                        : "text"
                              }
                              className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm"
                              placeholder={field.placeholder || field.label}
                              disabled
                            />
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowPreview(null)}
                >
                  {t("common.close")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => {
                    openEdit(showPreview);
                    setShowPreview(null);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #EA580C)",
                  }}
                >
                  <Edit02Icon width={14} height={14} /> {t("intake.editForm")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
