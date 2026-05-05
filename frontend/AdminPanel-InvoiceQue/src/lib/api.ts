// ── Admin Panel API Client ────────────────────────────────────
// Connects to the same API Gateway but with admin-level access

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
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

// ── Types ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

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
  currency: string;
  exchange_rate_idr: number;
  user_id?: string;
}

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
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
}

export interface SubscriptionTransaction {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: string;
  checkout_url?: string;
  external_id?: string;
  xendit_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id?: string;
  type: string;
  recipient: string;
  subject: string;
  message: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

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

// ── Auth API ──────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  profile: () =>
    request<User>('/auth/profile'),
};

// ── Users API (Admin) ─────────────────────────────────────────

export const usersApi = {
  list: (search?: string, page = 1, perPage = 50) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<User>>(`/auth/users?${params}`);
  },

  get: (id: string) =>
    request<User>(`/auth/users/${id}`),

  updateRole: (id: string, role: string) =>
    request<User>(`/auth/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/auth/users/${id}`, {
      method: 'DELETE',
    }),
};

// ── Clients API ───────────────────────────────────────────────

export const clientsApi = {
  list: (search?: string, page = 1, perPage = 50) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<Client>>(`/clients?${params}`);
  },
};

// ── Invoices API ──────────────────────────────────────────────

export const invoicesApi = {
  list: (status?: string, page = 0, size = 50) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('size', String(size));
    return request<PaginatedResponse<Invoice>>(`/invoices?${params}`);
  },

  get: (id: string) =>
    request<Invoice>(`/invoices/${id}`),

  delete: (id: string) =>
    request<{ message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    }),
};

// ── Payment Links API ─────────────────────────────────────────

export const paymentLinksApi = {
  list: (page = 1, perPage = 50) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return request<PaginatedResponse<PaymentLink>>(`/payments?${params}`);
  },

  delete: (id: string) =>
    request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE',
    }),
};

// ── Subscriptions API ─────────────────────────────────────────

export const subscriptionsApi = {
  getPlans: () =>
    request<{ data: SubscriptionPlan[] }>('/subscriptions/plans'),

  listAll: () =>
    request<{ data: Subscription[] }>('/subscriptions/all'),

  getTransactions: () =>
    request<{ data: SubscriptionTransaction[] }>('/subscriptions/transactions'),

  updatePlan: (id: string, data: Partial<SubscriptionPlan>) =>
    request<{ message: string; data: SubscriptionPlan }>(`/subscriptions/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Notifications API ─────────────────────────────────────────

export const notificationsApi = {
  list: () =>
    request<{ data: NotificationLog[]; total: number }>('/notifications'),
};

// ── Dashboard API ─────────────────────────────────────────────

export const dashboardApi = {
  getStats: () =>
    request<DashboardStats>('/dashboard/stats'),

  getRevenueChart: (months = 12) =>
    request<RevenueChartItem[]>(`/dashboard/revenue-chart?months=${months}`),
};
