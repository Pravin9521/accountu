export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type ApiOrganization = {
  id: string;
  name: string;
  currency: string;
};

export type DashboardOverview = {
  totals: {
    receivable: number;
    payable: number;
    interestAccrued: number;
    currency: string;
  };
  recentTransactions: {
    id: string;
    customer: {
      id: string;
      name: string;
      phone?: string;
      email?: string;
    } | null;
    type: 'credit' | 'debit';
    amount: number;
    note?: string;
    transactionDate: string;
    createdAt: string;
  }[];
};

export type MonthlyReport = {
  currency: string;
  monthly: {
    year: number;
    month: number;
    totalCredit: number;
    totalDebit: number;
    net: number;
    count: number;
  }[];
};

export type ApiCustomer = {
  id: string;
  org: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  category?: string;
  openingBalance?: number;
};

export type PagedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type ApiTransaction = {
  id: string;
  org: string;
  customer: string;
  type: 'credit' | 'debit';
  amount: number;
  note?: string;
  transactionDate: string;
  createdAt: string;
};

export type ApiReminder = {
  _id: string;
  org: string;
  customer: string;
  channel: 'email' | 'sms' | 'whatsapp';
  message: string;
  dueAmount: number;
  scheduledAt?: string;
  sentAt?: string;
  status: 'scheduled' | 'sent' | 'failed';
  isManual: boolean;
  error?: string;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return 'http://localhost:5000';
};

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      if (data?.message && typeof data.message === 'string') {
        message = data.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
};

export const signupApi = async (payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const res = await fetch(`${getBaseUrl()}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<AuthResponse>(res);
};

export const loginApi = async (payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<AuthResponse>(res);
};

export const getOrganizationsApi = async (token: string): Promise<ApiOrganization[]> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<ApiOrganization[]>(res);
};

export const createOrganizationApi = async (
  token: string,
  payload: { name: string; currency?: string }
): Promise<ApiOrganization> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<ApiOrganization>(res);
};

export const updateOrganizationApi = async (
  token: string,
  orgId: string,
  payload: Partial<{ name: string; contactPhone: string; contactEmail: string; address: string; currency: string; logoUrl: string; settings: unknown }>
): Promise<ApiOrganization> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs/${orgId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<ApiOrganization>(res);
};


export const getDashboardOverviewApi = async (
  token: string,
  orgId: string
): Promise<DashboardOverview> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs/${orgId}/dashboard/overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<DashboardOverview>(res);
};

export const getMonthlyReportApi = async (
  token: string,
  orgId: string
): Promise<MonthlyReport> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs/${orgId}/dashboard/monthly`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<MonthlyReport>(res);
};

export const getCustomersApiPaged = async (
  token: string,
  orgId: string,
  options: { page?: number; search?: string } = {}
): Promise<PagedResponse<ApiCustomer>> => {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.search) params.set('search', options.search);

  const res = await fetch(
    `${getBaseUrl()}/api/orgs/${orgId}/customers?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<PagedResponse<ApiCustomer>>(res);
};

export const createCustomerApi = async (
  token: string,
  orgId: string,
  payload: { name: string; phone?: string; email?: string; notes?: string; category?: string }
): Promise<ApiCustomer> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs/${orgId}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<ApiCustomer>(res);
};

export const getTransactionsByCustomerApi = async (
  token: string,
  orgId: string,
  customerId: string,
  options: { from?: string; to?: string } = {}
): Promise<PagedResponse<ApiTransaction>> => {
  const params = new URLSearchParams();
  params.set('customerId', customerId);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);

  const res = await fetch(
    `${getBaseUrl()}/api/orgs/${orgId}/transactions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<PagedResponse<ApiTransaction>>(res);
};

export const createTransactionApi = async (
  token: string,
  orgId: string,
  payload: { customerId: string; type: 'credit' | 'debit'; amount: number; note?: string }
): Promise<ApiTransaction> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs/${orgId}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<ApiTransaction>(res);
};

export const sendManualReminderApi = async (
  token: string,
  orgId: string,
  customerId: string,
  payload: { channel?: 'email' | 'sms' | 'whatsapp'; template?: string; amount?: number }
): Promise<{ reminderId: string; status: string; channel: string; message: string; dueAmount: number }> => {
  const res = await fetch(
    `${getBaseUrl()}/api/orgs/${orgId}/customers/${customerId}/reminders/send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  return handleResponse(res);
};

export const runOrgRemindersApi = async (
  token: string,
  orgId: string,
  payload: { channel?: 'email' | 'sms' | 'whatsapp' } = {}
): Promise<{ message: string; sentCount: number; channel: string }> => {
  const res = await fetch(`${getBaseUrl()}/api/orgs/${orgId}/reminders/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
};

export const listOrgRemindersApi = async (
  token: string,
  orgId: string,
  options: { page?: number } = {}
): Promise<PagedResponse<ApiReminder>> => {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));

  const res = await fetch(
    `${getBaseUrl()}/api/orgs/${orgId}/reminders?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse<PagedResponse<ApiReminder>>(res);
};
