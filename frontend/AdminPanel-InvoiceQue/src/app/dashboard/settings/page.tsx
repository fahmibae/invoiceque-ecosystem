'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Shield, User, Mail, Building2, Phone, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call for saving profile
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-red-400" />
            </div>
            Pengaturan Akun
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">Kelola profil admin Anda</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
        <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-600 
              flex items-center justify-center text-white text-2xl font-bold border-2 border-red-500/30">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{user?.name || 'Admin User'}</h2>
              <p className="text-sm text-zinc-400">{user?.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-red-400 uppercase tracking-widest font-semibold">Super Admin</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="admin-input pl-10"
                    placeholder="Nama Admin"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="admin-input pl-10 bg-white/[0.02]"
                    placeholder="admin@invoiceque.id"
                    disabled
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Email tidak dapat diubah</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={user?.role || 'admin'}
                    className="admin-input pl-10 bg-white/[0.02]"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-end gap-4">
              {saved && <span className="text-sm text-emerald-400 font-medium">Berhasil disimpan!</span>}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Informasi Sistem</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-zinc-400">Versi Admin Panel</span>
              <span className="text-sm text-zinc-200 font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-zinc-400">Environment</span>
              <span className="text-sm text-emerald-400 font-mono">Production</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-zinc-400">API Gateway</span>
              <span className="text-sm text-zinc-200 font-mono">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
