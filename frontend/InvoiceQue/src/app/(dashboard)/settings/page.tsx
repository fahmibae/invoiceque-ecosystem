'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { invoiceSettingsApi, authApi } from '@/lib/api';
import XenditSetupCard from '@/components/XenditSetupCard';
import PaypalSetupCard from '@/components/PaypalSetupCard';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import Link from 'next/link';
import { Payment02Icon, Building02Icon, PaintBoardIcon, Notification01Icon } from 'hugeicons-react';

const featureLabels: Record<string, string> = {
  basic_invoicing: 'Invoicing Dasar',
  email_notifications: 'Notifikasi Email',
  custom_branding: 'Custom Branding',
  priority_support: 'Prioritas Support',
  xendit_integration: 'Integrasi Xendit',
  api_access: 'API Access',
  dedicated_support: 'Dedicated Support',
  sla: 'SLA Agreement',
};

const colorPresets = ['#DC2626', '#2563EB', '#7C3AED', '#059669', '#D97706', '#DB2777', '#0891B2', '#4F46E5'];

type SettingsTab = 'general' | 'billing';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Business profile state
  const [bizName, setBizName] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#DC2626');
  const [footerText, setFooterText] = useState('Terima kasih atas kepercayaan Anda 🙏');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Payment settings state
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState('');

  // User profile state
  const { user } = useAuth();
  const [userName, setUserName] = useState('');
  const [userCompany, setUserCompany] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userMsg, setUserMsg] = useState('');

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      setUserName(user.name || '');
      setUserCompany(user.company || '');
      setUserPhone(user.phone || '');
    }
  }, [user]);

  // Load invoice settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setBizName(s.business_name || '');
      setBizEmail(s.business_email || '');
      setBizPhone(s.business_phone || '');
      setBizWebsite(s.business_website || '');
      setBizAddress(s.business_address || '');
      setLogoUrl(s.logo_url || '');
      setAccentColor(s.accent_color || '#DC2626');
      setFooterText(s.footer_text || 'Terima kasih atas kepercayaan Anda 🙏');
      setBankName(s.bank_name || '');
      setBankAccountNumber(s.bank_account_number || '');
      setBankAccountName(s.bank_account_name || '');
    } catch {
      // Use defaults if API not available
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await invoiceSettingsApi.update({
        business_name: bizName,
        business_email: bizEmail,
        business_phone: bizPhone,
        business_website: bizWebsite,
        business_address: bizAddress,
        logo_url: logoUrl,
        accent_color: accentColor,
        footer_text: footerText,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
      });
      setProfileMsg('✅ Berhasil disimpan!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('❌ Gagal menyimpan');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveUserProfile = async () => {
    setSavingUser(true);
    setUserMsg('');
    try {
      await authApi.updateProfile(userName, userCompany, userPhone);
      setUserMsg('✅ Berhasil disimpan!');
      setTimeout(() => setUserMsg(''), 3000);
      if (user) {
        localStorage.setItem('user', JSON.stringify({ ...user, name: userName, company: userCompany, phone: userPhone }));
      }
    } catch {
      setUserMsg('❌ Gagal menyimpan');
    } finally {
      setSavingUser(false);
    }
  };

  const savePassword = async () => {
    if (!oldPassword || !newPassword) return;
    setSavingPassword(true);
    setPasswordMsg('');
    try {
      await authApi.changePassword(oldPassword, newPassword);
      setPasswordMsg('✅ Password berhasil diubah!');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch {
      setPasswordMsg('❌ Gagal mengubah password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-subtitle">Kelola profil bisnis, desain invoice, dan langganan Anda</p>
        </div>
        <div className="flex">
          <Link href="/subscription" className="btn btn-secondary flex items-center gap-2">
            <span>Upgrade</span>
          </Link>
        </div>

      </div>
      <div className="flex flex-col gap-5">
        {/* User Profile */}
        <div className="card">
          <h3 className="flex items-center gap-2 text-base font-bold mb-5 pb-3 border-b border-border-light">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Profil Pengguna
          </h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            Kelola informasi akun Anda
          </p>
          <div className="form-group mb-4">
            <label className="form-label">Email Akun (Tidak dapat diubah)</label>
            <input type="text" className="form-input bg-bg-main text-text-tertiary" value={user?.email || ''} disabled />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input type="text" className="form-input" placeholder="Nama Anda" value={userName} onChange={e => setUserName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Perusahaan / Instansi</label>
              <input type="text" className="form-input" placeholder="Nama Perusahaan" value={userCompany} onChange={e => setUserCompany(e.target.value)} />
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">No. Telepon Akun</label>
            <PhoneInput
              international
              defaultCountry="ID"
              className="form-input flex items-center"
              placeholder="+62 812 3456 7890"
              value={userPhone}
              onChange={(val) => setUserPhone(val || '')}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveUserProfile} disabled={savingUser}>
              {savingUser ? 'Menyimpan...' : 'Simpan Profil Pengguna'}
            </button>
            {userMsg && <span className="text-sm font-medium text-green-600">{userMsg}</span>}
          </div>

          <div className="mt-8 pt-6 border-t border-border-light">
            <h4 className="font-bold mb-4 text-sm flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Ubah Password
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password Lama</label>
                <input type="password" className="form-input" placeholder="Masukkan password lama" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input type="password" className="form-input" placeholder="Minimal 6 karakter" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button className="btn btn-secondary" onClick={savePassword} disabled={savingPassword || !oldPassword || !newPassword}>
                {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
              </button>
              {passwordMsg && <span className="text-sm font-medium text-green-600">{passwordMsg}</span>}
            </div>
          </div>
        </div>

        {/* Business Profile */}
        <div className="card">
          <h3 className="flex items-center gap-2 text-base font-bold mb-5 pb-3 border-b border-border-light"><Building02Icon /> Profil Bisnis</h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            Informasi ini akan tampil di header invoice PDF Anda
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Bisnis</label>
              <input type="text" className="form-input" placeholder="PT Contoh Sukses" value={bizName} onChange={e => setBizName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Bisnis</label>
              <input type="email" className="form-input" placeholder="hello@bisnis.com" value={bizEmail} onChange={e => setBizEmail(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <PhoneInput
                international
                defaultCountry="ID"
                className="form-input flex items-center"
                placeholder="+62 812 3456 7890"
                value={bizPhone}
                onChange={(val) => setBizPhone(val || '')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input type="url" className="form-input" placeholder="https://bisnis.com" value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Alamat</label>
            <textarea className="form-input form-textarea" placeholder="Jl. Contoh No. 123, Jakarta" value={bizAddress} onChange={e => setBizAddress(e.target.value)} />
          </div>
        </div>

        {/* Invoice Design */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light"><PaintBoardIcon /> Desain Invoice</h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            Kustomisasi tampilan PDF invoice Anda
          </p>

          {/* Color Picker */}
          <div className="form-group">
            <label className="form-label">Warna Aksen</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {colorPresets.map(c => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, background: c, border: accentColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-8 border-none cursor-pointer" />
              <input type="text" className="form-input w-[100px] font-mono" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Logo Perusahaan (Opsional)</label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const MAX_WIDTH = 300;
                      const MAX_HEIGHT = 300;
                      let width = img.width;
                      let height = img.height;

                      if (width > height) {
                        if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                        }
                      } else {
                        if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                        }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);

                      // Compress to base64
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                      setLogoUrl(dataUrl);
                    };
                    img.src = event.target?.result as string;
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-sm text-text-secondary
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-red-50 file:text-red-600
                    hover:file:bg-red-100"
              />
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap font-semibold"
                >
                  Hapus Logo
                </button>
              )}
            </div>

            {logoUrl && (
              <div className="mt-3 p-3 bg-transparent border border-border-light rounded-md max-w-xs flex items-center justify-center h-24 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-[10px]" style={{ border: `2px solid ${accentColor}` }}>
            <div className="flex justify-between items-center pb-3 mb-3" style={{ borderBottom: `3px solid ${accentColor}` }}>
              <div className="flex gap-4 items-center">
                {logoUrl && (
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-xl" style={{ color: accentColor }}>{bizName || 'Nama Bisnis Anda'}</div>
                  {bizEmail && <div className="text-[10px] text-[#888]">{bizEmail}</div>}
                  {bizPhone && <div className="text-[10px] text-[#888]">{bizPhone}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-base">INVOICE</div>
                <div className="text-xs font-bold" style={{ color: accentColor }}>INV-2025-001</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-[#999] pt-2 border-t border-[#eee]">
              {footerText}
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Teks Footer</label>
            <input type="text" className="form-input" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Terima kasih atas kepercayaan Anda" />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Menyimpan...' : 'Simpan Profil & Desain'}
          </button>
          {profileMsg && <span className="text-sm">{profileMsg}</span>}
        </div>

        {/* Payment Settings */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light"><Payment02Icon /> Pengaturan Pembayaran</h3>
          <p className="text-[13px] text-text-tertiary mb-4">
            Informasi rekening bank yang akan ditampilkan di invoice sebagai opsi transfer manual
          </p>
          <div className="form-group">
            <label className="form-label">Nama Bank</label>
            <input type="text" className="form-input" placeholder="Bank Central Asia (BCA)" value={bankName} onChange={e => setBankName(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">No. Rekening</label>
              <input type="text" className="form-input" placeholder="123 456 7890" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Atas Nama</label>
              <input type="text" className="form-input" placeholder="PT Contoh Sukses" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <button className="btn btn-primary" onClick={async () => {
              setSavingPayment(true);
              setPaymentMsg('');
              try {
                await invoiceSettingsApi.update({
                  business_name: bizName,
                  business_email: bizEmail,
                  business_phone: bizPhone,
                  business_website: bizWebsite,
                  business_address: bizAddress,
                  logo_url: logoUrl,
                  accent_color: accentColor,
                  footer_text: footerText,
                  bank_name: bankName,
                  bank_account_number: bankAccountNumber,
                  bank_account_name: bankAccountName,
                });
                setPaymentMsg('✅ Berhasil disimpan!');
                setTimeout(() => setPaymentMsg(''), 3000);
              } catch {
                setPaymentMsg('❌ Gagal menyimpan');
              } finally {
                setSavingPayment(false);
              }
            }} disabled={savingPayment}>
              {savingPayment ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
            {paymentMsg && <span className="text-sm">{paymentMsg}</span>}
          </div>
          <XenditSetupCard />
          <PaypalSetupCard />
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 className="flex gap-2 items-center text-base font-bold mb-5 pb-3 border-b border-border-light"><Notification01Icon /> Notifikasi</h3>
          <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
            <div>
              <div className="text-sm font-semibold mb-0.5">Email Invoice Terkirim</div>
              <div className="text-xs text-text-tertiary">Notifikasi saat invoice berhasil dikirim</div>
            </div>
            <label className="relative inline-block w-12 h-[26px] shrink-0">
              <input type="checkbox" defaultChecked className="peer opacity-0 w-0 h-0" />
              <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
            </label>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
            <div>
              <div className="text-sm font-semibold mb-0.5">Payment Received</div>
              <div className="text-xs text-text-tertiary">Notifikasi saat pembayaran diterima</div>
            </div>
            <label className="relative inline-block w-12 h-[26px] shrink-0">
              <input type="checkbox" defaultChecked className="peer opacity-0 w-0 h-0" />
              <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
            </label>
          </div>
          <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
            <div>
              <div className="text-sm font-semibold mb-0.5">Invoice Overdue</div>
              <div className="text-xs text-text-tertiary">Notifikasi saat invoice melewati jatuh tempo</div>
            </div>
            <label className="relative inline-block w-12 h-[26px] shrink-0">
              <input type="checkbox" defaultChecked className="peer opacity-0 w-0 h-0" />
              <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
