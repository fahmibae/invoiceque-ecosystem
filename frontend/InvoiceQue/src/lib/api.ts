const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));

    // Auto-logout on 401 Unauthorized (token missing, expired, or invalid)
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    throw new Error(error.error || error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Shared Types ──────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── Auth API ──────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  role: string;
  email_verified?: boolean;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
}

export interface EmailVerificationResponse {
  message: string;
  email?: string;
  requires_verification?: boolean;
  user?: User;
}

export interface AuthMessageResponse {
  message: string;
  user?: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, company?: string, phone?: string) =>
    request<EmailVerificationResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, company, phone }),
    }),

  verifyEmail: (token: string) =>
    request<EmailVerificationResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    request<EmailVerificationResponse>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    request<AuthMessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<AuthMessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

  googleLogin: (idToken: string) =>
    request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  profile: () =>
    request<User>('/auth/profile'),

  updateProfile: (name: string, company: string, phone: string) =>
    request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, company, phone }),
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),
};

// ── Client API ────────────────────────────────────────

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  notes: string;
  total_invoices: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  notes?: string;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  notes?: string;
}

export const clientApi = {
  list: (search?: string, page = 1, perPage = 10) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<Client>>(`/clients?${params}`);
  },

  get: (id: string) =>
    request<Client>(`/clients/${id}`),

  create: (body: CreateClientRequest) =>
    request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdateClientRequest) =>
    request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/clients/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/clients/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// ── Invoice API ───────────────────────────────────────

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  invoice_number?: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  payment_type: string;
  dp_percentage: number;
  dp_amount: number;
  amount_paid: number;
  amount_remaining: number;
  due_date: string;
  created_at: string;
  paid_at?: string;
  notes?: string;
  payment_link?: string;
  remaining_payment_link?: string;
  currency: string;
  exchange_rate_idr: number;
}

type InvoiceApiResponse = Invoice & {
  invoice_number?: string;
};

function normalizeInvoice(invoice: InvoiceApiResponse): Invoice {
  const invoiceNumber = invoice.number || invoice.invoice_number || '';

  return {
    ...invoice,
    number: invoiceNumber,
    invoice_number: invoice.invoice_number || invoiceNumber,
    client_id: invoice.client_id || '',
    client_name: invoice.client_name || '',
    client_email: invoice.client_email || '',
    items: invoice.items || [],
    subtotal: invoice.subtotal ?? 0,
    tax: invoice.tax ?? 0,
    discount: invoice.discount ?? 0,
    total: invoice.total ?? 0,
    status: invoice.status || 'draft',
    payment_type: invoice.payment_type || 'full',
    dp_percentage: invoice.dp_percentage ?? 0,
    dp_amount: invoice.dp_amount ?? 0,
    amount_paid: invoice.amount_paid ?? 0,
    amount_remaining: invoice.amount_remaining ?? 0,
    due_date: invoice.due_date || '',
    created_at: invoice.created_at || '',
    paid_at: invoice.paid_at || '',
    notes: invoice.notes || '',
    payment_link: invoice.payment_link || '',
    remaining_payment_link: invoice.remaining_payment_link || '',
    currency: invoice.currency || 'IDR',
    exchange_rate_idr: invoice.exchange_rate_idr ?? 0,
  };
}

function normalizeInvoicePage(response: PaginatedResponse<InvoiceApiResponse>): PaginatedResponse<Invoice> {
  return {
    ...response,
    data: (response.data || []).map(normalizeInvoice),
  };
}

export interface CreateInvoiceRequest {
  client_id: string;
  client_name: string;
  client_email?: string;
  items: { description: string; quantity: number; price: number }[];
  tax?: number;
  discount?: number;
  due_date?: string;
  notes?: string;
  status?: string;
  payment_type?: string;
  dp_percentage?: number;
  currency?: string;
}

export const invoiceApi = {
  list: (status?: string, page = 0, size = 10) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('size', String(size));
    return request<PaginatedResponse<InvoiceApiResponse>>(`/invoices?${params}`)
      .then(normalizeInvoicePage);
  },

  get: (id: string) =>
    request<InvoiceApiResponse>(`/invoices/${id}`).then(normalizeInvoice),

  create: (body: CreateInvoiceRequest) =>
    request<InvoiceApiResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(normalizeInvoice),

  update: (id: string, body: CreateInvoiceRequest) =>
    request<InvoiceApiResponse>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }).then(normalizeInvoice),

  delete: (id: string) =>
    request<{ message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    }),

  send: (id: string) =>
    request<InvoiceApiResponse>(`/invoices/${id}/send`, {
      method: 'PUT',
    }).then(normalizeInvoice),

  downloadPdf: async (id: string, filename: string) => {
    window.location.href = `/invoices/${id}?download=true`;
  },

  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/invoices/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  /** Returns invoices that can still receive a payment link (not fully paid, or DP with remaining balance) */
  listLinkable: () =>
    request<{ data: InvoiceApiResponse[] }>('/invoices/linkable')
      .then((response) => ({
        ...response,
        data: (response.data || []).map(normalizeInvoice),
      })),
};

// ── Dashboard API ─────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingAmount: number;
  overdueInvoices: number;
  activePaymentLinks: number;
}

export interface RevenueChartItem {
  month: string;
  revenue: number;
}

export const dashboardApi = {
  getStats: () =>
    request<DashboardStats>('/dashboard/stats'),

  getRevenueChart: (months = 6) =>
    request<RevenueChartItem[]>(`/dashboard/revenue-chart?months=${months}`),
};

// ── Payment Link API ──────────────────────────────────

export interface PaymentLink {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  url: string;
  clicks: number;
  payments: number;
  invoice_id?: string;
  payment_provider?: string;
  provider_order_id?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentLinkRequest {
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  invoice_id?: string;
  expires_at?: string;
  payment_provider?: string;
  client_name?: string;
  client_email?: string;
}

export interface UpdatePaymentLinkRequest {
  title?: string;
  description?: string;
  amount?: number;
  status?: string;
  expires_at?: string;
}

export const paymentLinkApi = {
  list: (page = 1, perPage = 10) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<PaymentLink>>(`/payments?${params}`);
  },

  get: (id: string) =>
    request<PaymentLink>(`/payments/${id}`),

  create: (body: CreatePaymentLinkRequest) =>
    request<PaymentLink>('/payments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdatePaymentLinkRequest) =>
    request<PaymentLink>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/payments/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  /** Cascade delete payment links associated with a single invoice */
  deleteByInvoice: (invoiceId: string) =>
    request<{ message: string; deleted: number }>(`/payments/by-invoice/${invoiceId}`, {
      method: 'DELETE',
    }),

  /** Cascade delete payment links associated with multiple invoices */
  deleteByInvoices: (invoiceIds: string[]) =>
    request<{ message: string; deleted: number }>('/payments/by-invoices', {
      method: 'POST',
      body: JSON.stringify({ invoice_ids: invoiceIds }),
    }),
};

// ── Notification API ──────────────────────────────────

export interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  message: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

export const notificationApi = {
  list: (page = 1, perPage = 15) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<{ data: NotificationLog[]; total: number; page: number; per_page: number; total_pages: number; unread_count: number }>(`/notifications?${params}`);
  },

  markAsRead: (id: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    request<{ message: string; updated: number }>(`/notifications/read-all`, {
      method: 'PUT',
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  deleteAll: () =>
    request<{ message: string; deleted: number }>(`/notifications`, {
      method: 'DELETE',
    }),

  deleteBatch: (ids: string[]) =>
    request<{ message: string; deleted: number }>(`/notifications/delete-batch`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// ── Subscription API ──────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price: number;
  currency: string;
  billing_period: string;
  max_invoices: number;
  max_clients: number;
  max_payment_links: number;
  features: string;
  is_active: boolean;
}

export interface Subscription {
  current_period_end: string;
  current_period_start: string;
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  invoices_used: number;
  clients_used: number;
  payment_links_used: number;
  plan: SubscriptionPlan;
}

export interface UsageData {
  invoices_used: number;
  invoices_limit: number;
  clients_used: number;
  clients_limit: number;
  payment_links_used: number;
  payment_links_limit: number;
  can_create_invoice: boolean;
  can_create_client: boolean;
  can_create_payment: boolean;
  plan_id?: string;
  plan_name?: string;
  plan_display_name?: string;
  plan_price?: number;
  locked_resources?: SubscriptionResource[];
}

export type SubscriptionResource = 'invoices' | 'clients' | 'payment_links';

export interface LimitCheckResponse {
  allowed: boolean;
  resource: SubscriptionResource;
  used: number;
  limit: number;
  plan?: string;
  tier?: string;
  upgrade?: string;
}

export const subscriptionApi = {
  getPlans: async () => {
    const res = await request<SubscriptionPlan[] | { data: SubscriptionPlan[] }>('/plans');
    // backend may return either an array of plans or an object { data: [...] }
    if (Array.isArray(res)) {
      return { data: res as SubscriptionPlan[] };
    }
    return res as { data: SubscriptionPlan[] };
  },

  getCurrent: () =>
    request<Subscription>('/subscriptions/current'),

  getUsage: () =>
    request<UsageData>('/subscriptions/usage'),

  checkLimit: (resource: SubscriptionResource) =>
    request<LimitCheckResponse>(`/subscriptions/check?resource=${resource}`),

  sendUpgradeRecommendation: (resource?: SubscriptionResource) =>
    request<{ sent: number; skipped: number; failed: number; locked_resources: SubscriptionResource[] }>('/subscriptions/upgrade-recommendation', {
      method: 'POST',
      body: JSON.stringify(resource ? { resource } : {}),
    }),

  subscribe: (planId: string) =>
    request<{ message: string; plan: SubscriptionPlan }>('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    }),

  checkout: (planId: string) =>
    request<{ checkout_url: string; transaction_id: string; external_id: string }>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    }),

  checkoutStatus: (externalId: string) =>
    request<{ status: string; external_id: string; plan_id: string; amount: number }>(`/subscription/checkout/status/${externalId}`),
};

// ── Xendit Account API ────────────────────────────────

export interface XenditAccount {
  id: string;
  xendit_user_id: string;
  account_email: string;
  business_name: string;
  status: string;
  platform_fee_percent: number;
}

export const xenditApi = {
  getAccount: () =>
    request<XenditAccount>('/payments/xendit/account'),

  setup: (email: string, businessName: string) =>
    request<XenditAccount>('/payments/xendit/setup', {
      method: 'POST',
      body: JSON.stringify({
        account_email: email,
        business_name: businessName,
      }),
    }),

  disconnect: () =>
    request<{ message: string }>('/payments/xendit/account', {
      method: 'DELETE',
    }),
};

// ── PayPal Account API (Email-only) ───────────────────

export interface PaypalAccount {
  id: string;
  paypal_email: string;
  status: string;
}

export const paypalApi = {
  getAccount: () =>
    request<PaypalAccount>('/payments/paypal/account'),

  /** Connect user's PayPal — just needs their PayPal email */
  connect: (paypalEmail: string) =>
    request<PaypalAccount>('/payments/paypal/setup', {
      method: 'POST',
      body: JSON.stringify({ paypal_email: paypalEmail }),
    }),

  disconnect: () =>
    request<{ message: string }>('/payments/paypal/account', {
      method: 'DELETE',
    }),

  captureOrder: (orderId: string) =>
    request<{ status: string; order_id: string; message: string }>(`/payments/paypal/capture/${orderId}`, {
      method: 'POST',
    }),
};

// ── Invoice Settings API ──────────────────────────────

export interface InvoiceSettingsData {
  user_id?: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_website: string;
  business_address: string;
  logo_url?: string;
  accent_color: string;
  footer_text: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

export const invoiceSettingsApi = {
  get: () =>
    request<InvoiceSettingsData>('/invoice-settings'),

  update: (data: Partial<InvoiceSettingsData>) =>
    request<InvoiceSettingsData>('/invoice-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Quotation API ─────────────────────────────────────

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  user_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  valid_until: string;
  notes: string;
  currency: string;
  accept_token: string;
  converted_invoice_id: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  rejected_at?: string;
  items: QuotationItem[];
}

export interface CreateQuotationRequest {
  client_id: string;
  client_name: string;
  client_email?: string;
  items: { description: string; quantity: number; price: number }[];
  tax?: number;
  discount?: number;
  valid_until?: string;
  notes?: string;
  currency?: string;
}

export interface QuotationStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  converted: number;
  total_value: number;
  conversion_rate: number;
}

export const quotationApi = {
  list: (status?: string, page = 1, perPage = 10) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<Quotation>>(`/quotations?${params}`);
  },
  get: (id: string) => request<Quotation>(`/quotations/${id}`),
  create: (body: CreateQuotationRequest) =>
    request<Quotation>('/quotations', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: CreateQuotationRequest) =>
    request<Quotation>(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => request<{ message: string }>(`/quotations/${id}`, { method: 'DELETE' }),
  send: (id: string) => request<Quotation>(`/quotations/${id}/send`, { method: 'PUT' }),
  convert: (id: string) =>
    request<{ message: string; invoice_id: string; invoice_number: string }>(`/quotations/${id}/convert`, { method: 'POST' }),
  stats: () => request<QuotationStats>('/quotations/stats'),
  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/quotations/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
};

// ── Client Portal API ─────────────────────────────────

export interface PortalToken {
  id: string;
  user_id: string;
  client_id: string;
  token: string;
  client_name: string;
  client_email: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface PortalDashboard {
  client: {
    name: string;
    email: string;
    company: string;
    business_name: string;
    business_logo: string;
    accent_color: string;
  };
  invoices: {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    amount_remaining: number;
    status: string;
    currency: string;
    due_date: string;
    payment_link: string;
    created_at: string;
    paid_at?: string;
  }[];
  quotations: {
    id: string;
    quotation_number: string;
    total: number;
    status: string;
    currency: string;
    valid_until: string;
    accept_token: string;
    created_at: string;
  }[];
  stats: {
    total_invoices: number;
    total_paid: number;
    total_outstanding: number;
    total_quotations: number;
  };
}

export const portalApi = {
  listLinks: () => request<{ data: PortalToken[] }>('/portal/links'),
  generateLink: (clientId: string) =>
    request<PortalToken>(`/portal/generate/${clientId}`, { method: 'POST' }),
  revokeLink: (clientId: string) =>
    request<{ message: string }>(`/portal/revoke/${clientId}`, { method: 'DELETE' }),
  updateLink: (clientId: string, body: { name?: string; email?: string }) =>
    request<PortalToken>(`/portal/update/${clientId}`, { method: 'PUT', body: JSON.stringify(body) }),
  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/portal/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  /** Public — no auth needed */
  getPortal: (token: string) =>
    request<PortalDashboard>(`/portal/${token}`),
};

// ── Public Quotation API (no auth) ────────────────────
export const publicQuoteApi = {
  get: (token: string) => request<Quotation>(`/quote/${token}`),
  accept: (token: string) => request<Quotation>(`/quote/${token}/accept`, { method: 'POST' }),
  reject: (token: string) => request<Quotation>(`/quote/${token}/reject`, { method: 'POST' }),
};

// ── Payment Chaser API ────────────────────────────────

export interface PaymentChaser {
  id: string;
  user_id: string;
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  amount_due: number;
  currency: string;
  due_date: string;
  status: string;
  total_reminders_sent: number;
  last_reminder_at: string;
  next_reminder_at: string;
  schedule: string;
  created_at: string;
  updated_at: string;
}

export interface ChaserLog {
  id: string;
  chaser_id: string;
  invoice_id: string;
  reminder_type: string;
  day_offset: number;
  channel: string;
  status: string;
  message: string;
  sent_at: string;
}

export interface ChaserStats {
  active: number;
  paused: number;
  completed: number;
  total_reminders_sent: number;
  total_amount_chasing: number;
}

export const chaserApi = {
  list: (status?: string, page = 1, perPage = 10) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<PaymentChaser>>(`/chasers?${params}`);
  },
  create: (invoiceId: string, schedule?: string) =>
    request<PaymentChaser>('/chasers', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId, schedule }),
    }),
  delete: (id: string) => request<{ message: string }>(`/chasers/${id}`, { method: 'DELETE' }),
  toggle: (id: string) => request<PaymentChaser>(`/chasers/${id}/toggle`, { method: 'PUT' }),
  sendReminder: (id: string) =>
    request<{ message: string; log_id: string }>(`/chasers/${id}/send`, { method: 'POST' }),
  getLogs: (id: string) => request<{ data: ChaserLog[] }>(`/chasers/${id}/logs`),
  stats: () => request<ChaserStats>('/chasers/stats'),
  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/chasers/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
};

// ── Business Health Score API ─────────────────────────

export interface ClientHealthScore {
  client_id: string;
  client_name: string;
  total_invoices: number;
  total_paid: number;
  avg_days_to_pay: number;
  on_time_rate: number;
  reliability_score: number;
}

export interface HealthScore {
  overall_score: number;
  collection_rate: number;
  avg_days_to_pay: number;
  revenue_trend: string;
  revenue_trend_pct: number;
  overdue_ratio: number;
  client_concentration: number;
  top_clients: ClientHealthScore[];
  worst_clients: ClientHealthScore[];
  monthly_summary: {
    this_month_revenue: number;
    last_month_revenue: number;
    this_month_invoices: number;
    last_month_invoices: number;
    this_month_new_clients: number;
  };
  breakdown: {
    collection_score: number;
    speed_score: number;
    growth_score: number;
    diversity_score: number;
  };
}

export const healthApi = {
  getScore: () => request<HealthScore>('/dashboard/health-score'),
};

// ── Task API ──────────────────────────────────────────

export interface Task {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'inprogress' | 'done';
  priority: 'low' | 'medium' | 'high';
  client_id?: string;
  client_name: string;
  project_name: string;
  due_date?: string;
  hourly_rate: number;
  estimated_hours: number;
  tags: string[];
  sort_order: number;
  completed_at?: string;
  invoice_generated: boolean;
  invoice_id?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface TaskStats {
  backlog: number;
  todo: number;
  inprogress: number;
  done: number;
  total: number;
}

export const taskApi = {
  list: (params?: { status?: string; priority?: string; search?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.priority) qs.set('priority', params.priority);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<Task>>(`/tasks${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/tasks/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  stats: () => request<TaskStats>('/tasks/stats'),
};

// ── Project API ───────────────────────────────────────

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  client_id?: string;
  client_name: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  budget: number;
  hourly_rate: number;
  color: string;
  start_date?: string;
  deadline?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export const projectApi = {
  list: (params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<Project>>(`/projects${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
};

// ── Time Entry API ──────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string;
  task_title: string;
  project_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  notes: string;
  created_at: string;
}

export interface TimeEntryStats {
  today_seconds: number;
  week_seconds: number;
  month_seconds: number;
}

export const timeEntryApi = {
  list: (params?: { date?: string; date_from?: string; date_to?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<TimeEntry>>(`/time-entries${q ? `?${q}` : ''}`);
  },
  create: (data: Partial<TimeEntry>) =>
    request<TimeEntry>('/time-entries', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/time-entries/${id}`, { method: 'DELETE' }),
  stats: () => request<TimeEntryStats>('/time-entries/stats'),
};

// ── Toolkit API ──────────────────────────────────────────────

export type ToolkitType = 'snippet' | 'checklist' | 'palette' | 'brand_kit' | 'brief' | 'campaign' | 'session' | 'note' | 'contract_template' | 'rate_card' | 'link';

export interface ToolkitItem {
  id: string;
  user_id: string;
  toolkit_type: ToolkitType;
  project_id?: string;
  client_id?: string;
  title: string;
  content: Record<string, unknown>;
  language: string;
  tags: string[];
  is_favorited: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateToolkitItemRequest {
  toolkit_type: ToolkitType;
  title: string;
  content?: Record<string, unknown>;
  language?: string;
  tags?: string[];
  project_id?: string;
  client_id?: string;
  sort_order?: number;
}

export interface UpdateToolkitItemRequest {
  title?: string;
  toolkit_type?: ToolkitType;
  content?: Record<string, unknown>;
  language?: string;
  tags?: string[];
  project_id?: string;
  client_id?: string;
  sort_order?: number;
  is_favorited?: boolean;
}

export const toolkitApi = {
  list: (params?: { type?: ToolkitType; search?: string; language?: string; favorited?: boolean; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    if (params?.language) qs.set('language', params.language);
    if (params?.favorited) qs.set('favorited', 'true');
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<ToolkitItem>>(`/toolkit${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<ToolkitItem>(`/toolkit/${id}`),
  create: (data: CreateToolkitItemRequest) =>
    request<ToolkitItem>('/toolkit', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateToolkitItemRequest) =>
    request<ToolkitItem>(`/toolkit/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/toolkit/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/toolkit/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  stats: () => request<Record<string, number>>('/toolkit/stats'),
};

// ── Expense API ──────────────────────────────────────────────

export type ExpenseCategory =
  | 'software' | 'hardware' | 'internet' | 'hosting' | 'domain'
  | 'subscription' | 'coworking' | 'travel' | 'food' | 'office_supplies'
  | 'marketing' | 'education' | 'insurance' | 'tax' | 'contractor'
  | 'communication' | 'utilities' | 'other';

export interface Expense {
  id: string;
  user_id: string;
  project_id?: string;
  client_id?: string;
  category: ExpenseCategory;
  title: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_url: string;
  is_tax_deductible: boolean;
  is_recurring: boolean;
  recurring_interval: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  title: string;
  amount: number;
  category?: ExpenseCategory;
  description?: string;
  currency?: string;
  expense_date?: string;
  receipt_url?: string;
  is_tax_deductible?: boolean;
  is_recurring?: boolean;
  recurring_interval?: string;
  project_id?: string;
  client_id?: string;
  tags?: string[];
}

export interface UpdateExpenseRequest {
  title?: string;
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  currency?: string;
  expense_date?: string;
  receipt_url?: string;
  is_tax_deductible?: boolean;
  is_recurring?: boolean;
  recurring_interval?: string;
  project_id?: string;
  client_id?: string;
  tags?: string[];
}

export interface ExpenseStats {
  total_amount: number;
  total_count: number;
  tax_deductible_total: number;
  this_month: number;
  last_month: number;
  by_category: { category: string; count: number; total: number }[];
  monthly: { month: string; total: number; count: number }[];
}

export const expenseApi = {
  list: (params?: { category?: ExpenseCategory; search?: string; date_from?: string; date_to?: string; project_id?: string; client_id?: string; tax_deductible?: boolean; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.project_id) qs.set('project_id', params.project_id);
    if (params?.client_id) qs.set('client_id', params.client_id);
    if (params?.tax_deductible) qs.set('tax_deductible', 'true');
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<Expense>>(`/expenses${q ? `?${q}` : ''}`);
  },
  get: (id: string) => request<Expense>(`/expenses/${id}`),
  create: (data: CreateExpenseRequest) =>
    request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateExpenseRequest) =>
    request<Expense>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ message: string }>(`/expenses/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/expenses/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  stats: (year?: string) => {
    const qs = new URLSearchParams();
    if (year) qs.set('year', year);
    const q = qs.toString();
    return request<ExpenseStats>(`/expenses/stats${q ? `?${q}` : ''}`);
  },
  categories: () => request<{ categories: string[] }>('/expenses/categories'),
};

