'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function IdleDetector() {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (isIdle) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    }, IDLE_TIMEOUT);
  }, [isIdle]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  if (!isIdle) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          borderRadius: '1rem',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '420px',
          width: '90%',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💤</div>
        <h2
          style={{
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}
        >
          Sesi Tidak Aktif
        </h2>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            marginBottom: '2rem',
            lineHeight: 1.5,
          }}
        >
          Halaman dihentikan sementara karena tidak ada aktivitas selama 10 menit.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.4)';
          }}
        >
          Aktifkan Kembali
        </button>
      </div>
    </div>
  );
}
