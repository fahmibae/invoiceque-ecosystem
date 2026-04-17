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
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, company?: string, phone?: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, company, phone }),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  profile: () =>
    request<User>('/auth/profile'),
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
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
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
  client_id: string;
  client_name: string;
  client_email: string;
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
}

export const invoiceApi = {
  list: (status?: string, page = 0, size = 10) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('size', String(size));
    return request<PaginatedResponse<Invoice>>(`/invoices?${params}`);
  },

  get: (id: string) =>
    request<Invoice>(`/invoices/${id}`),

  create: (body: CreateInvoiceRequest) =>
    request<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: CreateInvoiceRequest) =>
    request<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    }),

  send: (id: string) =>
    request<Invoice>(`/invoices/${id}/send`, {
      method: 'PUT',
    }),

  downloadPdf: async (id: string, filename: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal download PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'invoice.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
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
};

// ── Notification API ──────────────────────────────────

export interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: string;
  created_at: string;
}

export const notificationApi = {
  list: () =>
    request<{ data: NotificationLog[]; total: number }>('/notifications'),
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
}

export const subscriptionApi = {
  getPlans: () =>
    request<{ data: SubscriptionPlan[] }>('/subscriptions/plans'),

  getCurrent: () =>
    request<Subscription>('/subscriptions/current'),

  getUsage: () =>
    request<UsageData>('/subscriptions/usage'),

  subscribe: (planId: string) =>
    request<{ message: string; plan: SubscriptionPlan }>('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    }),
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
