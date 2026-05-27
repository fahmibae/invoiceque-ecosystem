'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { timeEntryApi, type TimeEntry } from '@/lib/api';

const STORAGE_PREFIX = 'invoicequ:time-tracking:v1';
export const TIME_ENTRY_SAVED_EVENT = 'invoicequ:time-entry-saved';

export interface TimeTrackingDraft {
  taskId?: string;
  taskTitle: string;
  projectName: string;
}

export interface ActiveTimeSession {
  taskId?: string;
  taskTitle: string;
  projectName: string;
  startedAt: string;
  accumulatedSeconds: number;
  lastStartedAt: string | null;
  isRunning: boolean;
}

interface TimeTrackingContextValue {
  activeSession: ActiveTimeSession | null;
  elapsedSeconds: number;
  isRunning: boolean;
  isSaving: boolean;
  error: string;
  startTimer: (draft: TimeTrackingDraft) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<TimeEntry | null>;
  clearError: () => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextValue | undefined>(undefined);

function storageKeyForUser(userId?: string) {
  return userId ? `${STORAGE_PREFIX}:${userId}` : null;
}

function isValidDate(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

function parseStoredSession(raw: string | null): ActiveTimeSession | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<ActiveTimeSession>;
    if (
      typeof value.taskTitle !== 'string' ||
      !value.taskTitle.trim() ||
      typeof value.projectName !== 'string' ||
      typeof value.startedAt !== 'string' ||
      !isValidDate(value.startedAt)
    ) {
      return null;
    }

    const accumulatedSeconds = Number.isFinite(value.accumulatedSeconds)
      ? Math.max(0, Math.floor(value.accumulatedSeconds ?? 0))
      : 0;
    const isRunning = value.isRunning === true;
    const lastStartedAt =
      typeof value.lastStartedAt === 'string' && isValidDate(value.lastStartedAt)
        ? value.lastStartedAt
        : isRunning
          ? new Date().toISOString()
          : null;

    return {
      taskId: typeof value.taskId === 'string' && value.taskId ? value.taskId : undefined,
      taskTitle: value.taskTitle.trim(),
      projectName: value.projectName,
      startedAt: value.startedAt,
      accumulatedSeconds,
      lastStartedAt,
      isRunning,
    };
  } catch {
    return null;
  }
}

function calculateElapsedSeconds(session: ActiveTimeSession | null, nowMs = Date.now()) {
  if (!session) return 0;

  const base = Math.max(0, Math.floor(session.accumulatedSeconds));
  if (!session.isRunning || !session.lastStartedAt) {
    return base;
  }

  const lastStartedAtMs = new Date(session.lastStartedAt).getTime();
  if (!Number.isFinite(lastStartedAtMs)) {
    return base;
  }

  return Math.max(0, Math.floor(base + (nowMs - lastStartedAtMs) / 1000));
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toSaveError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Gagal menyimpan time entry. Coba lagi.';
}

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = storageKeyForUser(user?.id);
  const [activeSession, setActiveSession] = useState<ActiveTimeSession | null>(null);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storageKey) {
      setActiveSession(null);
      setHydratedStorageKey(null);
      return;
    }

    const storedSession = parseStoredSession(localStorage.getItem(storageKey));
    setActiveSession(storedSession);
    setHydratedStorageKey(storageKey);
    setNowMs(Date.now());
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || hydratedStorageKey !== storageKey) return;

    if (activeSession) {
      localStorage.setItem(storageKey, JSON.stringify(activeSession));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [activeSession, hydratedStorageKey, storageKey]);

  useEffect(() => {
    if (!activeSession?.isRunning) return;

    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeSession?.isRunning, activeSession?.lastStartedAt]);

  const elapsedSeconds = useMemo(
    () => calculateElapsedSeconds(activeSession, nowMs),
    [activeSession, nowMs],
  );

  const startTimer = useCallback((draft: TimeTrackingDraft) => {
    const taskTitle = draft.taskTitle.trim();
    if (!taskTitle) return;

    const now = new Date().toISOString();
    setError('');
    setActiveSession({
      taskId: draft.taskId || undefined,
      taskTitle,
      projectName: draft.projectName.trim(),
      startedAt: now,
      accumulatedSeconds: 0,
      lastStartedAt: now,
      isRunning: true,
    });
    setNowMs(Date.now());
  }, []);

  const pauseTimer = useCallback(() => {
    setActiveSession((current) => {
      if (!current || !current.isRunning) return current;

      return {
        ...current,
        accumulatedSeconds: calculateElapsedSeconds(current),
        lastStartedAt: null,
        isRunning: false,
      };
    });
    setNowMs(Date.now());
  }, []);

  const resumeTimer = useCallback(() => {
    setActiveSession((current) => {
      if (!current || current.isRunning) return current;

      const now = new Date().toISOString();
      return {
        ...current,
        lastStartedAt: now,
        isRunning: true,
      };
    });
    setNowMs(Date.now());
  }, []);

  const stopTimer = useCallback(async () => {
    if (!activeSession || isSaving) return null;

    const stoppedAt = new Date();
    const durationSeconds = calculateElapsedSeconds(activeSession, stoppedAt.getTime());
    const stoppedSession: ActiveTimeSession = {
      ...activeSession,
      accumulatedSeconds: durationSeconds,
      lastStartedAt: null,
      isRunning: false,
    };

    setActiveSession(stoppedSession);
    setNowMs(stoppedAt.getTime());

    if (durationSeconds <= 0) {
      setActiveSession(null);
      return null;
    }

    setIsSaving(true);
    setError('');

    try {
      const startedAt = new Date(activeSession.startedAt);
      const entry = await timeEntryApi.create({
        ...(activeSession.taskId ? { task_id: activeSession.taskId } : {}),
        task_title: activeSession.taskTitle,
        project_name: activeSession.projectName,
        date: formatLocalDate(startedAt),
        start_time: formatLocalTime(startedAt),
        end_time: formatLocalTime(stoppedAt),
        duration_seconds: durationSeconds,
      });

      setActiveSession(null);
      window.dispatchEvent(new CustomEvent(TIME_ENTRY_SAVED_EVENT, { detail: entry }));
      return entry;
    } catch (err) {
      setError(toSaveError(err));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [activeSession, isSaving]);

  const clearError = useCallback(() => setError(''), []);

  const value = useMemo<TimeTrackingContextValue>(() => ({
    activeSession,
    elapsedSeconds,
    isRunning: activeSession?.isRunning === true,
    isSaving,
    error,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    clearError,
  }), [
    activeSession,
    elapsedSeconds,
    isSaving,
    error,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    clearError,
  ]);

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
}

export function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
