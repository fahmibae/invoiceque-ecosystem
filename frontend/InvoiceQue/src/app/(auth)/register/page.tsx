'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, company || undefined, phone || undefined);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrasi gagal. Silakan coba lagi.');
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
            Mulai Kelola<br />Bisnis Anda<br /><span className={styles.heroHighlight}>Sekarang</span>
          </h1>
          <p className={styles.heroDesc}>
            Bergabung dengan ribuan bisnis yang sudah menggunakan InvoiceQue
            untuk mengelola invoice dan pembayaran mereka.
          </p>
          <div className={styles.heroFeatures}>
            <div className={styles.heroFeature}>🚀 Setup dalam 2 menit</div>
            <div className={styles.heroFeature}>💳 Gratis untuk 10 invoice</div>
            <div className={styles.heroFeature}>🔒 Keamanan terjamin</div>
            <div className={styles.heroFeature}>📱 Akses dari mana saja</div>
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
            <h2 className={styles.authTitle}>Buat Akun 🚀</h2>
            <p className={styles.authSubtitle}>Daftar gratis dan mulai buat invoice pertama Anda</p>
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
              <label className="form-label">Nama Lengkap</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <label className="form-label">Perusahaan (opsional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nama perusahaan"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">No. Telepon (opsional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+62 812 3456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginBottom: 16 }}
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>

            <div className={styles.divider}>
              <span>atau</span>
            </div>

            <button type="button" className={`btn btn-secondary btn-lg ${styles.socialBtn}`}>
              <span>🔵</span> Daftar dengan Google
            </button>
          </form>

          <p className={styles.authFooter}>
            Sudah punya akun?{' '}
            <Link href="/login" className={styles.authLink}>Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
