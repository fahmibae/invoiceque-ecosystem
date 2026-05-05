'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, RefreshCw, Shield, Mail, Phone, Building2,
  ChevronLeft, ChevronRight, Eye, Trash2, Crown, User as UserIcon,
  Calendar, X, MoreVertical,
} from 'lucide-react';
import { usersApi, type User } from '@/lib/api';
import { formatDate, formatRelative, getInitials } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const perPage = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list(search, page, perPage);
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-red-400" />
            </div>
            Manajemen User
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">{total} user terdaftar</p>
        </div>
        <button onClick={loadUsers} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="admin-input pl-11"
            placeholder="Cari nama atau email..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Perusahaan</th>
                <th>Role</th>
                <th>Bergabung</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton h-5 w-36" /></td>
                    <td><div className="skeleton h-5 w-44" /></td>
                    <td><div className="skeleton h-5 w-28" /></td>
                    <td><div className="skeleton h-5 w-16" /></td>
                    <td><div className="skeleton h-5 w-24" /></td>
                    <td><div className="skeleton h-5 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-600">
                    {search ? 'Tidak ada user ditemukan' : 'Belum ada user terdaftar'}
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600/30 to-red-600/30 
                          border border-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-300">
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium text-zinc-200">{user.name}</span>
                      </div>
                    </td>
                    <td className="text-zinc-400">{user.email}</td>
                    <td className="text-zinc-400">{user.company || '-'}</td>
                    <td>
                      <span className={`status-badge ${user.role === 'admin'
                        ? 'bg-violet-500/15 text-red-400 border-red-500/20'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                        }`}>
                        {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="text-zinc-500 text-xs">{formatRelative(user.created_at)}</td>
                    <td className="text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-zinc-500 hover:text-zinc-300"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenu === user.id && (
                          <div className="absolute right-0 top-full mt-1 glass-card p-1.5 min-w-[150px] z-10">
                            <button
                              onClick={() => { setSelectedUser(user); setActionMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-white/[0.04] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Lihat Detail
                            </button>
                            <button
                              onClick={() => setActionMenu(null)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus User
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04]">
            <p className="text-xs text-zinc-500">
              Menampilkan {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} dari {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 text-zinc-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${page === p
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'text-zinc-500 hover:bg-white/[0.04]'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 text-zinc-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Detail User</h3>
              <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 
                flex items-center justify-center text-white text-xl font-bold">
                {getInitials(selectedUser.name)}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{selectedUser.name}</h4>
                <span className={`status-badge text-[10px] mt-1 ${selectedUser.role === 'admin'
                  ? 'bg-violet-500/15 text-violet-400 border-violet-500/20'
                  : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                  }`}>
                  {selectedUser.role}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <Mail className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-zinc-200">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <Phone className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Telepon</p>
                  <p className="text-sm text-zinc-200">{selectedUser.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Perusahaan</p>
                  <p className="text-sm text-zinc-200">{selectedUser.company || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Bergabung</p>
                  <p className="text-sm text-zinc-200">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-[10px] text-zinc-600 font-mono">ID: {selectedUser.id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
