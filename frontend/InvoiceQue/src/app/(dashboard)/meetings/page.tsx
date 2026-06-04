"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Add01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Delete02Icon,
  Edit02Icon,
  Folder01Icon,
  GoogleDocIcon,
  Link04Icon,
  Loading03Icon,
  Search01Icon,
  Task01Icon,
  UserGroup03Icon,
} from "hugeicons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Portal from "@/components/ui/Portal";
import PremiumGate from "@/components/subscription/PremiumGate";
import { useLanguage } from "@/context/LanguageContext";
import {
  clientApi,
  meetingApi,
  projectApi,
  taskApi,
  type Client,
  type CreateMeetingRequest,
  type Meeting,
  type MeetingProvider,
  type MeetingStats,
  type MeetingStatus,
  type Project,
} from "@/lib/api";
import type { TranslationKey } from "@/lib/app-i18n";

type MeetingFormState = {
  title: string;
  client_id: string;
  client_name: string;
  project_id: string;
  project_name: string;
  provider: MeetingProvider;
  meeting_url: string;
  scheduled_at: string;
  duration_minutes: string;
  status: MeetingStatus;
  agenda: string;
  notes: string;
  summary: string;
  decisions: string;
  next_steps: string;
  action_items: string;
};

const emptyForm: MeetingFormState = {
  title: "",
  client_id: "",
  client_name: "",
  project_id: "",
  project_name: "",
  provider: "other",
  meeting_url: "",
  scheduled_at: "",
  duration_minutes: "30",
  status: "scheduled",
  agenda: "",
  notes: "",
  summary: "",
  decisions: "",
  next_steps: "",
  action_items: "",
};

const statusConfig: Record<
  MeetingStatus,
  { labelKey: TranslationKey; cls: string; dot: string }
> = {
  scheduled: {
    labelKey: "meetings.status.scheduled",
    cls: "badge-info",
    dot: "bg-blue-500",
  },
  completed: {
    labelKey: "meetings.status.completed",
    cls: "badge-success",
    dot: "bg-emerald-500",
  },
  cancelled: {
    labelKey: "meetings.status.cancelled",
    cls: "badge-default",
    dot: "bg-slate-400",
  },
};

const providerOptions: { value: MeetingProvider; labelKey: TranslationKey }[] =
  [
    { value: "zoom", labelKey: "meetings.provider.zoom" },
    { value: "google_meet", labelKey: "meetings.provider.googleMeet" },
    { value: "teams", labelKey: "meetings.provider.teams" },
    { value: "whatsapp", labelKey: "meetings.provider.whatsapp" },
    { value: "offline", labelKey: "meetings.provider.offline" },
    { value: "other", labelKey: "meetings.provider.other" },
  ];

const defaultStats: MeetingStats = {
  scheduled: 0,
  completed: 0,
  cancelled: 0,
  total: 0,
  upcoming: 0,
};

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function formatMeetingDate(value: string, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPayload(form: MeetingFormState): CreateMeetingRequest {
  return {
    title: form.title.trim(),
    client_id: form.client_id || undefined,
    client_name: form.client_name.trim(),
    project_id: form.project_id || undefined,
    project_name: form.project_name.trim(),
    provider: form.provider,
    meeting_url: form.meeting_url.trim(),
    scheduled_at: form.scheduled_at
      ? new Date(form.scheduled_at).toISOString()
      : "",
    duration_minutes: Number(form.duration_minutes) || 30,
    status: form.status,
    agenda: form.agenda.trim(),
    notes: form.notes.trim(),
    summary: form.summary.trim(),
    decisions: linesToArray(form.decisions),
    next_steps: linesToArray(form.next_steps),
    action_items: linesToArray(form.action_items),
  };
}

export default function MeetingsPage() {
  return (
    <PremiumGate feature="meetings">
      <MeetingsContent />
    </PremiumGate>
  );
}

function MeetingsContent() {
  const { t, intlLocale } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStats>(defaultStats);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [form, setForm] = useState<MeetingFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [creatingTaskKey, setCreatingTaskKey] = useState("");
  const [taskCreatedKey, setTaskCreatedKey] = useState("");

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meetingsRes, statsRes] = await Promise.allSettled([
        meetingApi.list({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
          client_id: clientFilter || undefined,
          per_page: 100,
        }),
        meetingApi.stats(),
      ]);

      if (meetingsRes.status === "fulfilled") {
        setMeetings(meetingsRes.value.data || []);
      } else {
        setError(
          meetingsRes.reason instanceof Error
            ? meetingsRes.reason.message
            : t("meetings.loadError"),
        );
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
    } finally {
      setLoading(false);
    }
  }, [clientFilter, search, statusFilter, t]);

  useEffect(() => {
    const timer = window.setTimeout(fetchMeetings, 250);
    return () => window.clearTimeout(timer);
  }, [fetchMeetings]);

  useEffect(() => {
    async function fetchReferences() {
      const [clientsRes, projectsRes] = await Promise.allSettled([
        clientApi.list("", 1, 100),
        projectApi.list({ per_page: 100 }),
      ]);

      if (clientsRes.status === "fulfilled")
        setClients(clientsRes.value.data || []);
      if (projectsRes.status === "fulfilled")
        setProjects(projectsRes.value.data || []);
    }

    fetchReferences();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client_id") || "";
    if (clientId) setClientFilter(clientId);
  }, []);

  const visibleClientName = clientFilter
    ? clientById.get(clientFilter)?.name
    : "";

  const openCreateForm = () => {
    const client = clientFilter ? clientById.get(clientFilter) : undefined;
    setEditingMeeting(null);
    setForm({
      ...emptyForm,
      client_id: client?.id || "",
      client_name: client?.name || "",
    });
    setShowForm(true);
  };

  const openEditForm = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setForm({
      title: meeting.title,
      client_id: meeting.client_id || "",
      client_name: meeting.client_name || "",
      project_id: meeting.project_id || "",
      project_name: meeting.project_name || "",
      provider: meeting.provider,
      meeting_url: meeting.meeting_url || "",
      scheduled_at: toDateTimeLocal(meeting.scheduled_at),
      duration_minutes: String(meeting.duration_minutes || 30),
      status: meeting.status,
      agenda: meeting.agenda || "",
      notes: meeting.notes || "",
      summary: meeting.summary || "",
      decisions: meeting.decisions.join("\n"),
      next_steps: meeting.next_steps.join("\n"),
      action_items: meeting.action_items.join("\n"),
    });
    setShowForm(true);
  };

  const handleClientChange = (clientId: string) => {
    const client = clientById.get(clientId);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.name || "",
    }));
  };

  const handleProjectChange = (projectId: string) => {
    const project = projectById.get(projectId);
    setForm((prev) => ({
      ...prev,
      project_id: projectId,
      project_name: project?.name || "",
      client_id: project?.client_id || prev.client_id,
      client_name: project?.client_name || prev.client_name,
    }));
  };

  const saveMeeting = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editingMeeting) {
        await meetingApi.update(editingMeeting.id, payload);
      } else {
        await meetingApi.create(payload);
      }
      setShowForm(false);
      setEditingMeeting(null);
      setForm(emptyForm);
      fetchMeetings();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("meetings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async () => {
    if (!deleteTarget) return;
    try {
      await meetingApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchMeetings();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("meetings.deleteError"));
    }
  };

  const updateMeetingStatus = async (
    meeting: Meeting,
    status: MeetingStatus,
  ) => {
    try {
      await meetingApi.update(meeting.id, { status });
      fetchMeetings();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("meetings.statusError"));
    }
  };

  const createTaskFromAction = async (
    meeting: Meeting,
    actionItem: string,
    index: number,
  ) => {
    const key = `${meeting.id}-${index}`;
    setCreatingTaskKey(key);
    try {
      await taskApi.create({
        title: actionItem,
        description: [
          t("meetings.fromMeeting", { title: meeting.title }),
          meeting.summary,
          meeting.notes,
        ]
          .filter(Boolean)
          .join("\n\n"),
        status: "todo",
        priority: "medium",
        client_id: meeting.client_id || undefined,
        client_name: meeting.client_name || undefined,
        project_id: meeting.project_id || undefined,
        project_name: meeting.project_name || t("meetings.followUpProject"),
        tags: ["meeting", "follow-up"],
      });
      setTaskCreatedKey(key);
      window.setTimeout(() => setTaskCreatedKey(""), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("meetings.taskError"));
    } finally {
      setCreatingTaskKey("");
    }
  };

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={t("meetings.deleteTitle")}
        message={t("meetings.deleteMessage", {
          title: deleteTarget?.title || "",
        })}
        confirmText={t("common.delete")}
        onConfirm={deleteMeeting}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("meetings.title")}</h1>
          <p className="page-subtitle">
            {visibleClientName
              ? t("meetings.clientSubtitle", { client: visibleClientName })
              : t("meetings.subtitle")}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateForm}
        >
          <Add01Icon width={16} height={16} /> {t("meetings.newMeeting")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-secondary">
              {t("meetings.total")}
            </span>
            <Calendar03Icon width={20} height={20} className="text-red-500" />
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {stats.total}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-secondary">
              {t("meetings.scheduled")}
            </span>
            <Clock01Icon width={20} height={20} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {stats.scheduled}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-secondary">
              {t("meetings.upcoming")}
            </span>
            <UserGroup03Icon
              width={20}
              height={20}
              className="text-amber-500"
            />
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {stats.upcoming}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-secondary">
              {t("meetings.completed")}
            </span>
            <CheckmarkCircle01Icon
              width={20}
              height={20}
              className="text-emerald-500"
            />
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {stats.completed}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative min-w-[220px] flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
            <Search01Icon width={18} height={18} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("meetings.searchPlaceholder")}
            className="w-full rounded-md border border-border-color bg-bg-card py-3 pl-11 pr-4 text-sm outline-none focus:border-red-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-border-color bg-bg-card px-4 py-3 text-sm outline-none focus:border-red-400"
        >
          <option value="">{t("meetings.allStatus")}</option>
          <option value="scheduled">{t("meetings.status.scheduled")}</option>
          <option value="completed">{t("meetings.status.completed")}</option>
          <option value="cancelled">{t("meetings.status.cancelled")}</option>
        </select>
        <select
          value={clientFilter}
          onChange={(event) => setClientFilter(event.target.value)}
          className="rounded-md border border-border-color bg-bg-card px-4 py-3 text-sm outline-none focus:border-red-400"
        >
          <option value="">{t("meetings.allClients")}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/30 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loading03Icon
            width={34}
            height={34}
            className="animate-spin text-red-500"
          />
        </div>
      ) : meetings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {meetings.map((meeting) => {
            const status =
              statusConfig[meeting.status] || statusConfig.scheduled;
            const providerLabel =
              providerOptions.find(
                (option) => option.value === meeting.provider,
              )?.labelKey || "meetings.provider.other";

            return (
              <div key={meeting.id} className="card p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${status.dot}`}
                        />
                        <span className={`badge ${status.cls}`}>
                          {t(status.labelKey)}
                        </span>
                        <span className="rounded-md bg-bg-secondary px-2 py-1 text-[11px] font-bold text-text-secondary">
                          {t(providerLabel)}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-text-primary">
                        {meeting.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-text-secondary">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar03Icon width={14} height={14} />
                          {formatMeetingDate(
                            meeting.scheduled_at,
                            intlLocale,
                            t("meetings.notScheduled"),
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock01Icon width={14} height={14} />
                          {t("meetings.duration", {
                            count: meeting.duration_minutes || 30,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {meeting.meeting_url && (
                        <a
                          href={meeting.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-hover hover:text-red-500"
                          title={t("meetings.openLink")}
                        >
                          <Link04Icon width={17} height={17} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditForm(meeting)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
                        title={t("meetings.editMeeting")}
                      >
                        <Edit02Icon width={17} height={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(meeting)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        title={t("meetings.deleteMeeting")}
                      >
                        <Delete02Icon width={17} height={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-lg border border-border-light bg-bg-secondary/60 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-text-tertiary">
                        <UserGroup03Icon width={14} height={14} />{" "}
                        {t("meetings.client")}
                      </div>
                      {meeting.client_id ? (
                        <Link
                          href={`/clients/${meeting.client_id}`}
                          className="font-semibold text-text-primary hover:text-red-600"
                        >
                          {meeting.client_name || t("meetings.unnamed")}
                        </Link>
                      ) : (
                        <span className="font-semibold text-text-secondary">
                          {meeting.client_name || t("meetings.noClient")}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg border border-border-light bg-bg-secondary/60 p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-text-tertiary">
                        <Folder01Icon width={14} height={14} />{" "}
                        {t("meetings.project")}
                      </div>
                      <span className="font-semibold text-text-primary">
                        {meeting.project_name || t("meetings.noProject")}
                      </span>
                    </div>
                  </div>

                  {meeting.agenda && (
                    <div>
                      <div className="mb-1 text-xs font-bold uppercase text-text-tertiary">
                        {t("meetings.agenda")}
                      </div>
                      <p className="text-sm leading-relaxed text-text-secondary">
                        {meeting.agenda}
                      </p>
                    </div>
                  )}

                  {(meeting.summary || meeting.notes) && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {meeting.summary && (
                        <div className="rounded-lg border border-border-light p-3">
                          <div className="mb-1 text-xs font-bold uppercase text-text-tertiary">
                            {t("meetings.summary")}
                          </div>
                          <p className="text-sm leading-relaxed text-text-secondary">
                            {meeting.summary}
                          </p>
                        </div>
                      )}
                      {meeting.notes && (
                        <div className="rounded-lg border border-border-light p-3">
                          <div className="mb-1 text-xs font-bold uppercase text-text-tertiary">
                            {t("meetings.notes")}
                          </div>
                          <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                            {meeting.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(meeting.decisions.length > 0 ||
                    meeting.next_steps.length > 0) && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {meeting.decisions.length > 0 && (
                        <div>
                          <div className="mb-2 text-xs font-bold uppercase text-text-tertiary">
                            {t("meetings.decisions")}
                          </div>
                          <ul className="space-y-1.5 text-sm text-text-secondary">
                            {meeting.decisions.map((item) => (
                              <li key={item} className="flex gap-2">
                                <CheckmarkCircle01Icon
                                  width={15}
                                  height={15}
                                  className="mt-0.5 shrink-0 text-emerald-500"
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {meeting.next_steps.length > 0 && (
                        <div>
                          <div className="mb-2 text-xs font-bold uppercase text-text-tertiary">
                            {t("meetings.nextSteps")}
                          </div>
                          <ul className="space-y-1.5 text-sm text-text-secondary">
                            {meeting.next_steps.map((item) => (
                              <li key={item} className="flex gap-2">
                                <Task01Icon
                                  width={15}
                                  height={15}
                                  className="mt-0.5 shrink-0 text-blue-500"
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {meeting.action_items.length > 0 && (
                    <div className="border-t border-border-light pt-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                        <Task01Icon
                          width={17}
                          height={17}
                          className="text-red-500"
                        />{" "}
                        {t("meetings.actionItems")}
                      </div>
                      <div className="space-y-2">
                        {meeting.action_items.map((item, index) => {
                          const key = `${meeting.id}-${index}`;
                          const created = taskCreatedKey === key;
                          return (
                            <div
                              key={`${item}-${index}`}
                              className="flex flex-col gap-2 rounded-lg border border-border-light bg-bg-secondary/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span className="text-sm font-medium text-text-secondary">
                                {item}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  createTaskFromAction(meeting, item, index)
                                }
                                disabled={creatingTaskKey === key || created}
                                className="btn btn-secondary btn-sm shrink-0"
                              >
                                {creatingTaskKey === key ? (
                                  <Loading03Icon
                                    width={14}
                                    height={14}
                                    className="animate-spin"
                                  />
                                ) : created ? (
                                  <CheckmarkCircle01Icon
                                    width={14}
                                    height={14}
                                  />
                                ) : (
                                  <Task01Icon width={14} height={14} />
                                )}
                                {created
                                  ? t("meetings.created")
                                  : t("meetings.createTask")}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 border-t border-border-light pt-4">
                    {meeting.status !== "completed" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          updateMeetingStatus(meeting, "completed")
                        }
                      >
                        <CheckmarkCircle01Icon width={15} height={15} />{" "}
                        {t("meetings.markCompleted")}
                      </button>
                    )}
                    {meeting.status !== "cancelled" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          updateMeetingStatus(meeting, "cancelled")
                        }
                      >
                        <Cancel01Icon width={15} height={15} />{" "}
                        {t("meetings.cancelMeeting")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-color bg-bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/20">
            <GoogleDocIcon width={28} height={28} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            {t("meetings.emptyTitle")}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {t("meetings.emptySubtitle")}
          </p>
          <button
            type="button"
            className="btn btn-primary mt-5"
            onClick={openCreateForm}
          >
            <Add01Icon width={16} height={16} /> {t("meetings.newMeeting")}
          </button>
        </div>
      )}

      {showForm && (
        <Portal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-border-color bg-bg-card shadow-xl">
              <div className="flex items-start justify-between border-b border-border-light px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {editingMeeting
                      ? t("meetings.form.editTitle")
                      : t("meetings.form.createTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {t("meetings.form.subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
                  title={t("common.close")}
                >
                  <Cancel01Icon width={19} height={19} />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.form.meetingTitle")}
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                      placeholder="Weekly client sync"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.client")}
                    </label>
                    <select
                      value={form.client_id}
                      onChange={(event) =>
                        handleClientChange(event.target.value)
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    >
                      <option value="">{t("meetings.noClient")}</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.project")}
                    </label>
                    <select
                      value={form.project_id}
                      onChange={(event) =>
                        handleProjectChange(event.target.value)
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    >
                      <option value="">{t("meetings.noProject")}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.form.provider")}
                    </label>
                    <select
                      value={form.provider}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          provider: event.target.value as MeetingProvider,
                        }))
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    >
                      {providerOptions.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {t(provider.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.form.status")}
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as MeetingStatus,
                        }))
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    >
                      <option value="scheduled">
                        {t("meetings.status.scheduled")}
                      </option>
                      <option value="completed">
                        {t("meetings.status.completed")}
                      </option>
                      <option value="cancelled">
                        {t("meetings.status.cancelled")}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.form.schedule")}
                    </label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          scheduled_at: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.form.durationMinutes")}
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={form.duration_minutes}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          duration_minutes: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.form.meetingLink")}
                    </label>
                    <input
                      type="url"
                      value={form.provider === "google_meet" && !editingMeeting ? "" : form.meeting_url}
                      disabled={form.provider === "google_meet" && !editingMeeting}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          meeting_url: event.target.value,
                        }))
                      }
                      className={`w-full rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400 ${
                        form.provider === "google_meet" && !editingMeeting ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                      placeholder={
                        form.provider === "google_meet" && !editingMeeting
                          ? t("meetings.form.googleMeetAuto")
                          : "https://..."
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.agenda")}
                    </label>
                    <textarea
                      rows={3}
                      value={form.agenda}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          agenda: event.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.notes")}
                    </label>
                    <textarea
                      rows={6}
                      value={form.notes}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.summary")}
                    </label>
                    <textarea
                      rows={6}
                      value={form.summary}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          summary: event.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.decisions")}
                    </label>
                    <textarea
                      rows={5}
                      value={form.decisions}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          decisions: event.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                      placeholder={t("meetings.form.decisionsPlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.nextSteps")}
                    </label>
                    <textarea
                      rows={5}
                      value={form.next_steps}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          next_steps: event.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                      placeholder={t("meetings.form.nextStepsPlaceholder")}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-text-primary">
                      {t("meetings.actionItems")}
                    </label>
                    <textarea
                      rows={5}
                      value={form.action_items}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          action_items: event.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-md border border-border-color bg-bg-input px-4 py-3 text-sm outline-none focus:border-red-400"
                      placeholder={t("meetings.form.actionItemsPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border-light px-6 py-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveMeeting}
                  disabled={!form.title.trim() || saving}
                >
                  {saving && (
                    <Loading03Icon
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                  )}
                  {saving ? t("common.saving") : t("meetings.form.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
