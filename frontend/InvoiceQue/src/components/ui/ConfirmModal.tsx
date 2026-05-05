'use client';

import React from 'react';
import { Delete02Icon, Alert01Icon, InformationCircleIcon } from 'hugeicons-react';
import Portal from './Portal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isLoading = false,
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Portal>
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5">
      <div className="bg-bg-card rounded-2xl w-full max-w-[400px] shadow-xl overflow-hidden border border-border-color animate-fade-in">
        <div className="p-[24px_24px_16px] flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4 ${
            type === 'danger' ? 'bg-red-500/10 text-red-500' :
            type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
            'bg-blue-500/10 text-blue-500'
          }`}>
            {type === 'danger' && <Delete02Icon size={24} />}
            {type === 'warning' && <Alert01Icon size={24} />}
            {type === 'info' && <InformationCircleIcon size={24} />}
          </div>
          <h3 className="text-lg font-semibold text-text-primary m-0">{title}</h3>
        </div>
        <div className="px-6 text-center text-text-secondary text-sm leading-[1.5]">
          <p>{message}</p>
        </div>
        <div className="p-6 flex gap-3 justify-center">
          <button 
            className="btn btn-secondary flex-1" 
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn flex-1 ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
            style={type === 'danger' ? { background: '#EF4444', color: 'white', border: 'none' } : {}}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
