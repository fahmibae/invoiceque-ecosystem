'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authLeft}>
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <div className={styles.logoIcon}>IQ</div>
            <span className={styles.logoText}>InvoiceQue</span>
          </div>
          <h1 className={styles.heroTitle}>
            Kelola Invoice &<br />Payment Link<br />dengan <span className={styles.heroHighlight}>Mudah</span>
          </h1>
          <p className={styles.heroDesc}>
            Platform SaaS modern untuk membuat invoice profesional,
            mengirim payment link, dan melacak pembayaran secara real-time.
          </p>
          <div className={styles.heroFeatures}>
            <div className={styles.heroFeature}>✅ Invoice Otomatis</div>
            <div className={styles.heroFeature}>✅ Payment Link Instan</div>
            <div className={styles.heroFeature}>✅ Laporan Real-time</div>
            <div className={styles.heroFeature}>✅ Multi-device Support</div>
          </div>
        </div>
        <div className={styles.heroDecor}>
          <div className={styles.decorCircle1}></div>
          <div className={styles.decorCircle2}></div>
          <div className={styles.decorCircle3}></div>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authForm}>
          <div className={styles.authHeader}>
            <h2 className={styles.authTitle}>Selamat Datang 👋</h2>
            <p className={styles.authSubtitle}>Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              color: '#EF4444',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <a href="#" className={styles.forgotLink}>Lupa password?</a>
              </label>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginBottom: 16 }}
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>

            <div className={styles.divider}>
              <span>atau</span>
            </div>

            <button type="button" className={`btn btn-secondary btn-lg ${styles.socialBtn}`}>
              <span>🔵</span> Masuk dengan Google
            </button>
          </form>

          <p className={styles.authFooter}>
            Belum punya akun?{' '}
            <Link href="/register" className={styles.authLink}>Daftar Gratis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
