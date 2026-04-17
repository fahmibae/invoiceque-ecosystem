'use client';

import React, { useState } from 'react';
import styles from './pay.module.css';

export default function PublicPaymentPage() {
  const [paymentMethod, setPaymentMethod] = useState('transfer');

  return (
    <div className={styles.payPage}>
      <div className={styles.payContainer}>
        <div className={styles.payCard}>
          {/* Header */}
          <div className={styles.payHeader}>
            <div className={styles.payLogo}>IQ</div>
            <span className={styles.payBrand}>InvoiceQue</span>
          </div>

          {/* Payment Info */}
          <div className={styles.payInfo}>
            <h1 className={styles.payTitle}>Web Development Package</h1>
            <p className={styles.payDesc}>
              Pembayaran untuk paket pengembangan website termasuk design, development, dan deployment.
            </p>
            <div className={styles.payAmount}>Rp 30.800.000</div>
            <div className={styles.payMeta}>
              <span>Invoice: INV-2025-001</span>
              <span>•</span>
              <span>PT TechCorp Indonesia</span>
            </div>
          </div>

          {/* Divider */}
          <div className={styles.payDivider}></div>

          {/* Payment Method */}
          <div className={styles.payMethodSection}>
            <h3 className={styles.payMethodTitle}>Pilih Metode Pembayaran</h3>
            <div className={styles.methodGrid}>
              <label className={`${styles.methodCard} ${paymentMethod === 'transfer' ? styles.methodActive : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={styles.methodRadio}
                />
                <span className={styles.methodIcon}>🏦</span>
                <span className={styles.methodName}>Bank Transfer</span>
              </label>
              <label className={`${styles.methodCard} ${paymentMethod === 'ewallet' ? styles.methodActive : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value="ewallet"
                  checked={paymentMethod === 'ewallet'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={styles.methodRadio}
                />
                <span className={styles.methodIcon}>📱</span>
                <span className={styles.methodName}>E-Wallet</span>
              </label>
              <label className={`${styles.methodCard} ${paymentMethod === 'va' ? styles.methodActive : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value="va"
                  checked={paymentMethod === 'va'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={styles.methodRadio}
                />
                <span className={styles.methodIcon}>💳</span>
                <span className={styles.methodName}>Virtual Account</span>
              </label>
              <label className={`${styles.methodCard} ${paymentMethod === 'qris' ? styles.methodActive : ''}`}>
                <input
                  type="radio"
                  name="method"
                  value="qris"
                  checked={paymentMethod === 'qris'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={styles.methodRadio}
                />
                <span className={styles.methodIcon}>📷</span>
                <span className={styles.methodName}>QRIS</span>
              </label>
            </div>
          </div>

          {/* Payment Details */}
          {paymentMethod === 'transfer' && (
            <div className={styles.payDetails}>
              <h4 className={styles.detailTitle}>Detail Transfer Bank</h4>
              <div className={styles.bankInfo}>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>Bank</span>
                  <span className={styles.bankValue}>Bank Central Asia (BCA)</span>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>No. Rekening</span>
                  <span className={styles.bankValue}>123 456 7890</span>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>Atas Nama</span>
                  <span className={styles.bankValue}>PT InvoiceQue Studio</span>
                </div>
                <div className={styles.bankRow}>
                  <span className={styles.bankLabel}>Jumlah</span>
                  <span className={`${styles.bankValue} ${styles.bankAmount}`}>Rp 30.800.000</span>
                </div>
              </div>
            </div>
          )}

          {/* Pay Button */}
          <button className={`btn btn-primary btn-lg ${styles.payBtn}`}>
            💳 Bayar Sekarang — Rp 30.800.000
          </button>

          {/* Security Notice */}
          <div className={styles.securityNotice}>
            <span>🔒</span>
            <span>Pembayaran Anda dilindungi oleh enkripsi SSL 256-bit</span>
          </div>

          {/* Footer */}
          <div className={styles.payFooter}>
            <span>Powered by <strong>InvoiceQue</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
