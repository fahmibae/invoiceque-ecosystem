"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function IdleDetector() {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (isIdle) return; // Don't reset if already showing idle screen
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      // Clear caches to ensure Fly.io can sleep
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    }, IDLE_TIMEOUT);
  }, [isIdle]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );
    resetTimer(); // Start timer on mount

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  if (!isIdle) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
      className="text-center max-w-[420px] w-[90%] border border-red-500 rounded-md bg-gradient-to-r from-red-500 to-rose-500 shadow-lg"
        style={{
          padding: "3rem 2rem",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💤</div>
        <h2
          style={{
            color: "#fff",
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Sesi Tidak Aktif
        </h2>
        <p
          style={{
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: "0.9rem",
            marginBottom: "2rem",
            lineHeight: 1.5,
          }}
        >
          Aplikasi dihentikan sementara karena tidak ada aktivitas selama 10
          menit.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "white",
            color: "red",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 4px 14px rgba(255, 255, 255, 0.4)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 20px rgba(255, 255, 255, 0.5)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 14px rgba(255, 255, 255, 0.4)";
          }}
        >
          Aktifkan Kembali
        </button>
      </div>
    </div>
  );
}
