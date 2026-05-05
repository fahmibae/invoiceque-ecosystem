'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ViewIcon, ViewOffSlashIcon } from 'hugeicons-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Rocket01Icon, CreditCardIcon, LockIcon, GlobeIcon, GoogleIcon } from 'hugeicons-react';
import { useGoogleLogin } from '@react-oauth/google';

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
  const { register, googleLogin } = useAuth();

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      setLoading(true);
      await googleLogin(tokenResponse.access_token);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Login gagal.');
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google Login dibatalkan atau gagal.'),
  });

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
    <div className="flex min-h-screen lg:h-screen max-lg:h-[100dvh] lg:overflow-hidden max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:snap-x max-lg:snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex-1 max-lg:w-screen max-lg:h-full max-lg:flex-none max-lg:snap-center bg-gradient-to-br from-red-600 to-red-500 text-white flex items-center justify-center p-[60px_40px] max-lg:p-[40px_24px] relative overflow-hidden">
        <div className="relative z-10 max-w-[600px] max-lg:h-full max-lg:flex max-lg:flex-col max-lg:justify-center">
          <div className="flex items-center gap-3 mb-8">
            <img src="/images/invoiceque.svg" alt="InvoiceQu Logo" className="h-12 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-[-0.5px] mt-1.5">InvoiceQu</span>
              <span className="text-lg text-white font-medium tracking-[0.5px]">SaaS Platform</span>
            </div>
          </div>
          <h1 className="text-[42px] max-lg:text-[32px] max-sm:text-[26px] font-black leading-[1.15] mb-5 tracking-[-1px]">
            Mulai Kelola Bisnis Anda<br /><span className="bg-gradient-to-br from-red-300 to-white bg-clip-text text-transparent">Sekarang</span>
          </h1>
          <p className="text-base max-sm:text-sm opacity-85 leading-[1.7] mb-7">
            Bergabung dengan ribuan bisnis yang sudah menggunakan InvoiceQu
            untuk mengelola invoice dan pembayaran mereka.
          </p>
          <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-2.5">
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2"><Rocket01Icon className="size-5" /> Setup dalam 2 menit</div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2"><CreditCardIcon className="size-5" /> Gratis untuk 10 invoice</div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2"><LockIcon className="size-5" /> Keamanan terjamin</div>
            <div className="text-sm font-medium opacity-90 py-2 flex items-center gap-2"><GlobeIcon className="size-5" /> Akses dari mana saja</div>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-white/5"></div>
          <div className="absolute -bottom-[60px] -left-[60px] w-[200px] h-[200px] rounded-full bg-white/10"></div>
          <div className="absolute top-1/2 right-[10%] w-[120px] h-[120px] rounded-full bg-white/5"></div>
        </div>

        {/* Mobile Swipe Indicators */}
        <div className="lg:hidden absolute bottom-8 left-0 w-full flex flex-col items-center justify-center gap-3 z-20">
          <span className="text-white/90 text-sm font-medium animate-pulse flex items-center gap-2">
            Geser untuk Daftar
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </span>
          <div className="flex gap-2">
            <div className="w-6 h-1.5 rounded-full bg-white"></div>
            <div className="w-2 h-1.5 rounded-full bg-white/40"></div>
          </div>
        </div>
      </div>

      <div className="w-[480px] max-lg:w-screen max-lg:h-full max-lg:flex-none max-lg:snap-center p-10 max-lg:p-8 max-sm:p-[24px_16px] bg-bg-primary lg:h-screen lg:overflow-y-auto max-lg:overflow-y-auto relative">
        <div className="lg:hidden absolute top-6 right-6 flex gap-2 z-20">
          <div className="w-2 h-1.5 rounded-full bg-gray-300"></div>
          <div className="w-6 h-1.5 rounded-full bg-red-600"></div>
        </div>
        <div className="w-full max-w-[380px] mx-auto min-h-full flex flex-col justify-center py-8">
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold mb-2 tracking-[-0.5px]">Buat Akun 🚀</h2>
            <p className="text-text-secondary text-[15px]">Daftar gratis dan mulai buat invoice pertama Anda</p>
          </div>

          {error && (
            <div className="p-3 px-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
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
              <PhoneInput
                international
                defaultCountry="ID"
                className="form-input flex items-center"
                placeholder="+62 812 3456 7890"
                value={phone}
                onChange={(val) => setPhone(val || '')}
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
              className="btn btn-primary btn-lg w-full mb-4"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>

            <div className="flex items-center my-4 text-text-tertiary text-[13px] before:content-[''] before:flex-1 before:border-b before:border-border-color after:content-[''] after:flex-1 after:border-b after:border-border-color">
              <span className="px-4">atau</span>
            </div>

            <button type="button" onClick={() => loginWithGoogle()} className="btn btn-secondary btn-lg w-full mb-6">
              <span><GoogleIcon size={18} /></span> Daftar dengan Google
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-red-600 font-semibold no-underline hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
