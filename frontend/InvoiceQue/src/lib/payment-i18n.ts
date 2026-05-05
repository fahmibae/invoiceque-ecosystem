// ── Payment Page Internationalization (i18n) ──────────────────────
// Supports: id (Indonesian), en (English), ar (Arabic), ms (Malay), zh (Chinese), ja (Japanese)

export type PaymentLocale = 'id' | 'en' | 'ar' | 'ms' | 'zh' | 'ja';

export interface PaymentTranslations {
  // Direction
  dir: 'ltr' | 'rtl';

  // Main payment page
  invoice: string;
  billSubtitle: string;
  awaitingPayment: string;
  billTo: string;
  totalBill: string;
  itemDescription: string;
  amount: string;
  subtotal: string;
  total: string;
  choosePaymentMethod: string;
  paypalRedirectNotice: string;
  payWithPaypal: string;
  processing: string;
  xenditRedirectNotice: string;
  payViaXendit: string;
  transfer: string;
  eWallet: string;
  virtualAccount: string;
  qris: string;
  bankTransferInstructions: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  totalTransfer: string;
  confirmPayment: string;
  sslNotice: string;
  paymentCompleted: string;
  thankYouPaymentReceived: string;
  connectionFailed: string;
  failedToProcess: string;

  // PayPal return page
  processingPayment: string;
  verifyingPaypalPayment: string;
  paymentSuccessful: string;
  thankYouPaymentAccepted: string;
  emailConfirmationNotice: string;
  errorOccurred: string;
  cannotVerifyPayment: string;
  backToPaymentPage: string;

  // PayPal cancel page
  paymentCancelled: string;
  paymentCancelledNotice: string;

  // Xendit return page
  verifyingPayment: string;
  verifyingYourPayment: string;
  paymentExpired: string;
  paymentExpiredNotice: string;
  cannotVerifyContactSeller: string;
}

const translations: Record<PaymentLocale, PaymentTranslations> = {
  // ── Indonesian (Default) ───────────────────────────
  id: {
    dir: 'ltr',
    invoice: 'INVOICE',
    billSubtitle: 'Tagihan Pembayaran',
    awaitingPayment: 'MENUNGGU PEMBAYARAN',
    billTo: 'Tagihan Untuk',
    totalBill: 'Total Tagihan',
    itemDescription: 'Deskripsi Item',
    amount: 'Jumlah',
    subtotal: 'Subtotal',
    total: 'Total',
    choosePaymentMethod: 'Pilih Metode Pembayaran',
    paypalRedirectNotice: 'Anda akan diarahkan ke PayPal untuk menyelesaikan pembayaran dengan aman.',
    payWithPaypal: 'Bayar dengan PayPal',
    processing: 'Memproses...',
    xenditRedirectNotice: 'Anda akan diarahkan ke portal pembayaran Xendit untuk memilih metode pembayaran (Transfer Bank, Virtual Account, e-Wallet, dll).',
    payViaXendit: 'Bayar via Xendit',
    transfer: 'Transfer',
    eWallet: 'E-Wallet',
    virtualAccount: 'Virtual Acc',
    qris: 'QRIS',
    bankTransferInstructions: 'Instruksi Transfer Bank',
    bank: 'Bank',
    accountNumber: 'No. Rekening',
    accountName: 'Atas Nama',
    totalTransfer: 'Total Transfer',
    confirmPayment: 'Konfirmasi Pembayaran',
    sslNotice: 'Pembayaran dilindungi enkripsi SSL 256-bit',
    paymentCompleted: 'Pembayaran Selesai',
    thankYouPaymentReceived: 'Terima kasih! Pembayaran untuk',
    connectionFailed: 'Koneksi gagal. Coba lagi.',
    failedToProcess: 'Gagal memproses pembayaran',
    processingPayment: 'Memproses Pembayaran...',
    verifyingPaypalPayment: 'Mohon tunggu, kami sedang memverifikasi pembayaran PayPal Anda.',
    paymentSuccessful: 'Pembayaran Berhasil!',
    thankYouPaymentAccepted: 'Terima kasih! Pembayaran Anda telah diterima.',
    emailConfirmationNotice: '✉️ Konfirmasi pembayaran akan dikirim melalui email. Anda dapat menutup halaman ini.',
    errorOccurred: 'Terjadi Kesalahan',
    cannotVerifyPayment: 'Tidak dapat memverifikasi pembayaran. Silakan hubungi penjual.',
    backToPaymentPage: '← Kembali ke Halaman Pembayaran',
    paymentCancelled: 'Pembayaran Dibatalkan',
    paymentCancelledNotice: 'Anda telah membatalkan proses pembayaran PayPal. Tidak ada tagihan yang dikenakan.',
    verifyingPayment: 'Memverifikasi Pembayaran...',
    verifyingYourPayment: 'Mohon tunggu, kami sedang memverifikasi pembayaran Anda.',
    paymentExpired: 'Pembayaran Kedaluwarsa',
    paymentExpiredNotice: 'Link pembayaran ini sudah kedaluwarsa. Silakan hubungi penjual untuk mendapatkan link baru.',
    cannotVerifyContactSeller: 'Tidak dapat memverifikasi pembayaran. Silakan hubungi penjual.',
  },

  // ── English ────────────────────────────────────────
  en: {
    dir: 'ltr',
    invoice: 'INVOICE',
    billSubtitle: 'Payment Invoice',
    awaitingPayment: 'AWAITING PAYMENT',
    billTo: 'Bill To',
    totalBill: 'Total Due',
    itemDescription: 'Item Description',
    amount: 'Amount',
    subtotal: 'Subtotal',
    total: 'Total',
    choosePaymentMethod: 'Choose Payment Method',
    paypalRedirectNotice: 'You will be redirected to PayPal to complete your payment securely.',
    payWithPaypal: 'Pay with PayPal',
    processing: 'Processing...',
    xenditRedirectNotice: 'You will be redirected to the Xendit payment portal to select a payment method (Bank Transfer, Virtual Account, e-Wallet, etc.).',
    payViaXendit: 'Pay via Xendit',
    transfer: 'Transfer',
    eWallet: 'E-Wallet',
    virtualAccount: 'Virtual Acc',
    qris: 'QRIS',
    bankTransferInstructions: 'Bank Transfer Instructions',
    bank: 'Bank',
    accountNumber: 'Account No.',
    accountName: 'Account Name',
    totalTransfer: 'Total Transfer',
    confirmPayment: 'Confirm Payment',
    sslNotice: 'Payment protected by 256-bit SSL encryption',
    paymentCompleted: 'Payment Completed',
    thankYouPaymentReceived: 'Thank you! Payment for',
    connectionFailed: 'Connection failed. Please try again.',
    failedToProcess: 'Failed to process payment',
    processingPayment: 'Processing Payment...',
    verifyingPaypalPayment: 'Please wait, we are verifying your PayPal payment.',
    paymentSuccessful: 'Payment Successful!',
    thankYouPaymentAccepted: 'Thank you! Your payment has been received.',
    emailConfirmationNotice: '✉️ A payment confirmation will be sent via email. You can close this page.',
    errorOccurred: 'An Error Occurred',
    cannotVerifyPayment: 'Unable to verify payment. Please contact the seller.',
    backToPaymentPage: '← Back to Payment Page',
    paymentCancelled: 'Payment Cancelled',
    paymentCancelledNotice: 'You have cancelled the PayPal payment process. No charges have been applied.',
    verifyingPayment: 'Verifying Payment...',
    verifyingYourPayment: 'Please wait, we are verifying your payment.',
    paymentExpired: 'Payment Expired',
    paymentExpiredNotice: 'This payment link has expired. Please contact the seller for a new link.',
    cannotVerifyContactSeller: 'Unable to verify payment. Please contact the seller.',
  },

  // ── Arabic ─────────────────────────────────────────
  ar: {
    dir: 'rtl',
    invoice: 'فاتورة',
    billSubtitle: 'فاتورة الدفع',
    awaitingPayment: 'في انتظار الدفع',
    billTo: 'فاتورة إلى',
    totalBill: 'المبلغ الإجمالي',
    itemDescription: 'وصف العنصر',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    total: 'الإجمالي',
    choosePaymentMethod: 'اختر طريقة الدفع',
    paypalRedirectNotice: 'سيتم إعادة توجيهك إلى PayPal لإتمام الدفع بشكل آمن.',
    payWithPaypal: 'ادفع عبر PayPal',
    processing: 'جاري المعالجة...',
    xenditRedirectNotice: 'سيتم إعادة توجيهك إلى بوابة الدفع Xendit لاختيار طريقة الدفع (تحويل بنكي، حساب افتراضي، محفظة إلكترونية، إلخ).',
    payViaXendit: 'ادفع عبر Xendit',
    transfer: 'تحويل',
    eWallet: 'محفظة إلكترونية',
    virtualAccount: 'حساب افتراضي',
    qris: 'QRIS',
    bankTransferInstructions: 'تعليمات التحويل البنكي',
    bank: 'البنك',
    accountNumber: 'رقم الحساب',
    accountName: 'اسم الحساب',
    totalTransfer: 'إجمالي التحويل',
    confirmPayment: 'تأكيد الدفع',
    sslNotice: 'الدفع محمي بتشفير SSL 256 بت',
    paymentCompleted: 'تم الدفع',
    thankYouPaymentReceived: 'شكراً لك! تم استلام الدفع لـ',
    connectionFailed: 'فشل الاتصال. حاول مرة أخرى.',
    failedToProcess: 'فشل في معالجة الدفع',
    processingPayment: 'جاري معالجة الدفع...',
    verifyingPaypalPayment: 'يرجى الانتظار، نقوم بالتحقق من دفعتك عبر PayPal.',
    paymentSuccessful: 'تم الدفع بنجاح!',
    thankYouPaymentAccepted: 'شكراً لك! تم استلام دفعتك.',
    emailConfirmationNotice: '✉️ سيتم إرسال تأكيد الدفع عبر البريد الإلكتروني. يمكنك إغلاق هذه الصفحة.',
    errorOccurred: 'حدث خطأ',
    cannotVerifyPayment: 'تعذر التحقق من الدفع. يرجى الاتصال بالبائع.',
    backToPaymentPage: '← العودة إلى صفحة الدفع',
    paymentCancelled: 'تم إلغاء الدفع',
    paymentCancelledNotice: 'لقد ألغيت عملية الدفع عبر PayPal. لم يتم تحصيل أي رسوم.',
    verifyingPayment: 'جاري التحقق من الدفع...',
    verifyingYourPayment: 'يرجى الانتظار، نقوم بالتحقق من دفعتك.',
    paymentExpired: 'انتهت صلاحية الدفع',
    paymentExpiredNotice: 'انتهت صلاحية رابط الدفع هذا. يرجى الاتصال بالبائع للحصول على رابط جديد.',
    cannotVerifyContactSeller: 'تعذر التحقق من الدفع. يرجى الاتصال بالبائع.',
  },

  // ── Malay ──────────────────────────────────────────
  ms: {
    dir: 'ltr',
    invoice: 'INVOIS',
    billSubtitle: 'Invois Pembayaran',
    awaitingPayment: 'MENUNGGU PEMBAYARAN',
    billTo: 'Bil Kepada',
    totalBill: 'Jumlah Perlu Dibayar',
    itemDescription: 'Penerangan Item',
    amount: 'Jumlah',
    subtotal: 'Jumlah Kecil',
    total: 'Jumlah',
    choosePaymentMethod: 'Pilih Kaedah Pembayaran',
    paypalRedirectNotice: 'Anda akan diarahkan ke PayPal untuk melengkapkan pembayaran dengan selamat.',
    payWithPaypal: 'Bayar dengan PayPal',
    processing: 'Memproses...',
    xenditRedirectNotice: 'Anda akan diarahkan ke portal pembayaran Xendit untuk memilih kaedah pembayaran (Pindahan Bank, Akaun Maya, e-Dompet, dll).',
    payViaXendit: 'Bayar melalui Xendit',
    transfer: 'Pindahan',
    eWallet: 'E-Dompet',
    virtualAccount: 'Akaun Maya',
    qris: 'QRIS',
    bankTransferInstructions: 'Arahan Pindahan Bank',
    bank: 'Bank',
    accountNumber: 'No. Akaun',
    accountName: 'Nama Akaun',
    totalTransfer: 'Jumlah Pindahan',
    confirmPayment: 'Sahkan Pembayaran',
    sslNotice: 'Pembayaran dilindungi oleh penyulitan SSL 256-bit',
    paymentCompleted: 'Pembayaran Selesai',
    thankYouPaymentReceived: 'Terima kasih! Pembayaran untuk',
    connectionFailed: 'Sambungan gagal. Sila cuba lagi.',
    failedToProcess: 'Gagal memproses pembayaran',
    processingPayment: 'Memproses Pembayaran...',
    verifyingPaypalPayment: 'Sila tunggu, kami sedang mengesahkan pembayaran PayPal anda.',
    paymentSuccessful: 'Pembayaran Berjaya!',
    thankYouPaymentAccepted: 'Terima kasih! Pembayaran anda telah diterima.',
    emailConfirmationNotice: '✉️ Pengesahan pembayaran akan dihantar melalui e-mel. Anda boleh menutup halaman ini.',
    errorOccurred: 'Ralat Berlaku',
    cannotVerifyPayment: 'Tidak dapat mengesahkan pembayaran. Sila hubungi penjual.',
    backToPaymentPage: '← Kembali ke Halaman Pembayaran',
    paymentCancelled: 'Pembayaran Dibatalkan',
    paymentCancelledNotice: 'Anda telah membatalkan proses pembayaran PayPal. Tiada caj dikenakan.',
    verifyingPayment: 'Mengesahkan Pembayaran...',
    verifyingYourPayment: 'Sila tunggu, kami sedang mengesahkan pembayaran anda.',
    paymentExpired: 'Pembayaran Tamat Tempoh',
    paymentExpiredNotice: 'Pautan pembayaran ini telah tamat tempoh. Sila hubungi penjual untuk pautan baru.',
    cannotVerifyContactSeller: 'Tidak dapat mengesahkan pembayaran. Sila hubungi penjual.',
  },

  // ── Chinese (Simplified) ──────────────────────────
  zh: {
    dir: 'ltr',
    invoice: '发票',
    billSubtitle: '付款发票',
    awaitingPayment: '等待付款',
    billTo: '账单接收方',
    totalBill: '应付总额',
    itemDescription: '项目描述',
    amount: '金额',
    subtotal: '小计',
    total: '总计',
    choosePaymentMethod: '选择付款方式',
    paypalRedirectNotice: '您将被重定向到 PayPal 以安全地完成付款。',
    payWithPaypal: '使用 PayPal 付款',
    processing: '处理中...',
    xenditRedirectNotice: '您将被重定向到 Xendit 支付门户，选择付款方式（银行转账、虚拟账户、电子钱包等）。',
    payViaXendit: '通过 Xendit 付款',
    transfer: '转账',
    eWallet: '电子钱包',
    virtualAccount: '虚拟账户',
    qris: 'QRIS',
    bankTransferInstructions: '银行转账说明',
    bank: '银行',
    accountNumber: '账号',
    accountName: '户名',
    totalTransfer: '转账总额',
    confirmPayment: '确认付款',
    sslNotice: '付款受 256 位 SSL 加密保护',
    paymentCompleted: '付款完成',
    thankYouPaymentReceived: '谢谢！已收到',
    connectionFailed: '连接失败，请重试。',
    failedToProcess: '付款处理失败',
    processingPayment: '正在处理付款...',
    verifyingPaypalPayment: '请稍候，我们正在验证您的 PayPal 付款。',
    paymentSuccessful: '付款成功！',
    thankYouPaymentAccepted: '谢谢！您的付款已被接收。',
    emailConfirmationNotice: '✉️ 付款确认将通过电子邮件发送。您可以关闭此页面。',
    errorOccurred: '发生错误',
    cannotVerifyPayment: '无法验证付款。请联系卖家。',
    backToPaymentPage: '← 返回付款页面',
    paymentCancelled: '付款已取消',
    paymentCancelledNotice: '您已取消 PayPal 付款流程。未收取任何费用。',
    verifyingPayment: '正在验证付款...',
    verifyingYourPayment: '请稍候，我们正在验证您的付款。',
    paymentExpired: '付款已过期',
    paymentExpiredNotice: '此付款链接已过期。请联系卖家获取新链接。',
    cannotVerifyContactSeller: '无法验证付款。请联系卖家。',
  },

  // ── Japanese ───────────────────────────────────────
  ja: {
    dir: 'ltr',
    invoice: '請求書',
    billSubtitle: 'お支払い請求書',
    awaitingPayment: 'お支払い待ち',
    billTo: '請求先',
    totalBill: '合計金額',
    itemDescription: '項目の説明',
    amount: '金額',
    subtotal: '小計',
    total: '合計',
    choosePaymentMethod: 'お支払い方法を選択',
    paypalRedirectNotice: 'PayPalに移動して安全にお支払いを完了します。',
    payWithPaypal: 'PayPalで支払う',
    processing: '処理中...',
    xenditRedirectNotice: 'Xendit決済ポータルに移動して、お支払い方法（銀行振込、バーチャル口座、電子ウォレットなど）を選択します。',
    payViaXendit: 'Xenditで支払う',
    transfer: '振込',
    eWallet: '電子ウォレット',
    virtualAccount: 'バーチャル口座',
    qris: 'QRIS',
    bankTransferInstructions: '銀行振込の手順',
    bank: '銀行',
    accountNumber: '口座番号',
    accountName: '口座名義',
    totalTransfer: '振込合計',
    confirmPayment: 'お支払いを確認',
    sslNotice: 'お支払いは256ビットSSL暗号化で保護されています',
    paymentCompleted: 'お支払い完了',
    thankYouPaymentReceived: 'ありがとうございます！お支払いを受領しました：',
    connectionFailed: '接続に失敗しました。もう一度お試しください。',
    failedToProcess: 'お支払いの処理に失敗しました',
    processingPayment: 'お支払いを処理中...',
    verifyingPaypalPayment: 'しばらくお待ちください。PayPalのお支払いを確認中です。',
    paymentSuccessful: 'お支払い成功！',
    thankYouPaymentAccepted: 'ありがとうございます！お支払いが確認されました。',
    emailConfirmationNotice: '✉️ お支払い確認メールが送信されます。このページを閉じても構いません。',
    errorOccurred: 'エラーが発生しました',
    cannotVerifyPayment: 'お支払いを確認できませんでした。販売者にお問い合わせください。',
    backToPaymentPage: '← お支払いページに戻る',
    paymentCancelled: 'お支払いがキャンセルされました',
    paymentCancelledNotice: 'PayPalのお支払いプロセスがキャンセルされました。料金は発生しておりません。',
    verifyingPayment: 'お支払いを確認中...',
    verifyingYourPayment: 'しばらくお待ちください。お支払いを確認中です。',
    paymentExpired: 'お支払い期限切れ',
    paymentExpiredNotice: 'このお支払いリンクは期限切れです。販売者に新しいリンクをお問い合わせください。',
    cannotVerifyContactSeller: 'お支払いを確認できませんでした。販売者にお問い合わせください。',
  },
};

// Currency → locale mapping
const currencyLocaleMap: Record<string, PaymentLocale> = {
  IDR: 'id',
  USD: 'en',
  SGD: 'en',
  EUR: 'en',
  GBP: 'en',
  AUD: 'en',
  AED: 'ar',
  SAR: 'ar',
  QAR: 'ar',
  KWD: 'ar',
  BHD: 'ar',
  OMR: 'ar',
  EGP: 'ar',
  MYR: 'ms',
  CNY: 'zh',
  JPY: 'ja',
};

/**
 * Detect the best locale for the payment page.
 * Priority: URL ?lang= param > currency mapping > browser language > 'en'
 */
export function detectPaymentLocale(currency?: string): PaymentLocale {
  // 1. Check URL query param ?lang=
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang')?.toLowerCase();
    if (langParam && langParam in translations) {
      return langParam as PaymentLocale;
    }
  }

  // 2. Check currency mapping
  if (currency) {
    const mapped = currencyLocaleMap[currency.toUpperCase()];
    if (mapped) return mapped;
  }

  // 3. Check browser language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
    if (browserLang && browserLang in translations) {
      return browserLang as PaymentLocale;
    }
  }

  // 4. Default to English for international clients
  return 'en';
}

/**
 * Get translations for a given locale
 */
export function getPaymentTranslations(locale: PaymentLocale): PaymentTranslations {
  return translations[locale] || translations.en;
}

/**
 * Get the Intl locale string for number formatting
 */
export function getIntlLocale(locale: PaymentLocale, currency: string): string {
  const map: Record<PaymentLocale, string> = {
    id: 'id-ID',
    en: 'en-US',
    ar: 'ar-SA',
    ms: 'ms-MY',
    zh: 'zh-CN',
    ja: 'ja-JP',
  };
  // For IDR always use id-ID formatting regardless of locale
  if (currency === 'IDR') return 'id-ID';
  return map[locale] || 'en-US';
}

/** All supported locales for the language switcher */
export const supportedLocales: { code: PaymentLocale; label: string; flag: string }[] = [
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ms', label: 'Melayu', flag: '🇲🇾' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];
