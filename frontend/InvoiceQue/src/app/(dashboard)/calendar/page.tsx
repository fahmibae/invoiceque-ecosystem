"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar03Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Loading03Icon,
  Task01Icon,
  UserGroup03Icon,
  Link04Icon,
} from "hugeicons-react";
import { meetingApi, taskApi, type Meeting, type Task } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import PremiumGate from "@/components/subscription/PremiumGate";

const priorityColors: Record<string, string> = {
  high: "#DC2626",
  medium: "#F59E0B",
  low: "#10B981",
};

const statusColors: Record<string, string> = {
  backlog: "#94A3B8",
  todo: "#3B82F6",
  inprogress: "#F59E0B",
  done: "#10B981",
};

function toLocalDateKey(value: string) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return value.split(/[T ]/)[0];
}

export default function CalendarPage() {
  return (
    <PremiumGate feature="calendar">
      <CalendarContent />
    </PremiumGate>
  );
}

function CalendarContent() {
  const { t, intlLocale } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalendarData() {
      const [tasksRes, meetingsRes] = await Promise.allSettled([
        taskApi.list({ per_page: 200 }),
        meetingApi.list({ per_page: 200 }),
      ]);

      if (tasksRes.status === "fulfilled") setTasks(tasksRes.value.data || []);
      if (meetingsRes.status === "fulfilled")
        setMeetings(meetingsRes.value.data || []);
      setLoading(false);
    }

    fetchCalendarData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayLabels = [
    t("calendar.day.sun"),
    t("calendar.day.mon"),
    t("calendar.day.tue"),
    t("calendar.day.wed"),
    t("calendar.day.thu"),
    t("calendar.day.fri"),
    t("calendar.day.sat"),
  ];

  const monthName = currentDate.toLocaleString(intlLocale, {
    month: "long",
    year: "numeric",
  });

  const getTaskStatusLabel = (status: string) => {
    if (status === "todo") return t("calendar.status.todo");
    if (status === "inprogress") return t("calendar.status.inprogress");
    if (status === "done") return t("calendar.status.done");
    return t("calendar.status.backlog");
  };

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.due_date) {
        const dateStr = toLocalDateKey(t.due_date);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(t);
      }
    });
    return map;
  }, [tasks]);

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach((meeting) => {
      if (meeting.scheduled_at) {
        const dateStr = toLocalDateKey(meeting.scheduled_at);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(meeting);
      }
    });
    return map;
  }, [meetings]);

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedTasks = selectedDateStr
    ? tasksByDate[selectedDateStr] || []
    : [];
  const selectedMeetings = selectedDateStr
    ? meetingsByDate[selectedDateStr] || []
    : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("calendar.title")}</h1>
          <p className="page-subtitle">{t("calendar.subtitle")}</p>
        </div>
        <button className="btn btn-secondary" onClick={goToday}>
          {t("calendar.today")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loading03Icon
            width={32}
            height={32}
            className="animate-spin text-red-500"
          />
        </div>
      ) : (
        <div className="flex gap-6 flex-col xl:flex-row">
          {/* Calendar Grid */}
          <div className="card flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
                onClick={prevMonth}
              >
                <ArrowLeft01Icon width={18} height={18} />
              </button>
              <h3 className="text-base font-bold capitalize">{monthName}</h3>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
                onClick={nextMonth}
              >
                <ArrowRight01Icon width={18} height={18} />
              </button>
            </div>
            <div className="p-0">
              <div className="grid grid-cols-7">
                {dayLabels.map((d) => (
                  <div
                    key={d}
                    className="py-3 text-center text-xs font-bold text-text-tertiary uppercase tracking-wider border-b border-border-light"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((day, i) => {
                  const dateStr = day
                    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : "";
                  const dayTasks = tasksByDate[dateStr] || [];
                  const dayMeetings = meetingsByDate[dateStr] || [];
                  const dayItems = dayTasks.length + dayMeetings.length;
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  const isSelected = selectedDay === String(day);

                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] p-2 border-b border-r border-border-light transition-colors cursor-pointer ${
                        day ? "hover:bg-bg-hover" : "bg-bg-secondary/30"
                      } ${isSelected ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}
                      style={{
                        borderRight: (i + 1) % 7 === 0 ? "none" : undefined,
                      }}
                      onClick={() => day && setSelectedDay(String(day))}
                    >
                      {day && (
                        <>
                          <div
                            className={`text-sm mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${
                              isToday
                                ? "bg-red-500 text-white font-bold"
                                : "font-medium"
                            }`}
                          >
                            {day}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {dayTasks.slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate"
                                style={{
                                  background:
                                    (priorityColors[task.priority] ||
                                      "#6B7280") + "18",
                                  color:
                                    priorityColors[task.priority] || "#6B7280",
                                }}
                                title={`${task.title} (${task.priority})`}
                              >
                                {task.title}
                              </div>
                            ))}
                            {dayTasks.length < 3 &&
                              dayMeetings
                                .slice(0, 3 - dayTasks.length)
                                .map((meeting) => (
                                  <div
                                    key={meeting.id}
                                    className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                                    title={meeting.title}
                                  >
                                    {meeting.title}
                                  </div>
                                ))}
                            {dayItems > 3 && (
                              <div className="text-[10px] text-text-tertiary font-medium px-1">
                                {t("calendar.more", { count: dayItems - 3 })}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Day Detail */}
          <div className="w-full xl:w-80 shrink-0">
            <div className="card sticky top-5">
              <div className="px-5 py-4 border-b border-border-light">
                <h3 className="text-sm font-bold text-text-primary">
                  {selectedDateStr
                    ? new Date(selectedDateStr + "T00:00").toLocaleDateString(
                        intlLocale,
                        { weekday: "long", day: "numeric", month: "long" },
                      )
                    : t("calendar.chooseDate")}
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {t("calendar.daySummary", {
                    tasks: selectedTasks.length,
                    meetings: selectedMeetings.length,
                  })}
                </p>
              </div>
              <div className="p-4">
                {!selectedDateStr ? (
                  <div className="text-center py-8">
                    <Calendar03Icon
                      width={32}
                      height={32}
                      className="mx-auto mb-2 opacity-20"
                    />
                    <p className="text-xs text-text-tertiary">
                      {t("calendar.clickDate")}
                    </p>
                  </div>
                ) : selectedTasks.length === 0 &&
                  selectedMeetings.length === 0 ? (
                  <div className="text-center py-8">
                    <Task01Icon
                      width={32}
                      height={32}
                      className="mx-auto mb-2 opacity-20"
                    />
                    <p className="text-xs text-text-tertiary">
                      {t("calendar.noItems")}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-bg-secondary rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <h4 className="text-sm font-semibold text-text-primary leading-snug">
                            {task.title}
                          </h4>
                          <span
                            className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ml-2"
                            style={{
                              background:
                                (priorityColors[task.priority] || "#6B7280") +
                                "18",
                              color: priorityColors[task.priority] || "#6B7280",
                            }}
                          >
                            {task.priority}
                          </span>
                        </div>
                        {task.project_name && (
                          <p className="text-xs text-text-tertiary mb-1">
                            📁 {task.project_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                (statusColors[task.status] || "#6B7280") + "18",
                              color: statusColors[task.status] || "#6B7280",
                            }}
                          >
                            {getTaskStatusLabel(task.status)}
                          </span>
                          {task.estimated_hours > 0 && (
                            <span className="text-[10px] text-text-tertiary">
                              ⏱ {task.estimated_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-3 bg-blue-50/70 dark:bg-blue-900/10 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-1.5 gap-2">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-blue-600">
                              <UserGroup03Icon width={13} height={13} />{" "}
                              {t("calendar.meeting")}
                            </div>
                            <h4 className="text-sm font-semibold text-text-primary leading-snug">
                              {meeting.title}
                            </h4>
                          </div>
                          {meeting.meeting_url && (
                            <a
                              href={meeting.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              title={t("calendar.openMeetingLink")}
                            >
                              <Link04Icon width={14} height={14} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-text-tertiary mb-2">
                          {meeting.scheduled_at
                            ? new Date(meeting.scheduled_at).toLocaleTimeString(
                                intlLocale,
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : t("calendar.noTime")}{" "}
                          - {meeting.client_name || t("calendar.noClient")}
                        </p>
                        {(meeting.summary || meeting.agenda) && (
                          <p className="line-clamp-2 text-xs text-text-secondary">
                            {meeting.summary || meeting.agenda}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
