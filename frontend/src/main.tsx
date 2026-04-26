import "./style.css";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  loginApi,
  signupApi,
  getOrganizationsApi,
  createOrganizationApi,
  getDashboardOverviewApi,
  getMonthlyReportApi,
  getCustomersApiPaged,
  getTransactionsByCustomerApi,
  createCustomerApi,
  createTransactionApi,
  sendManualReminderApi,
  runOrgRemindersApi,
  listOrgRemindersApi,
  updateOrganizationApi,
} from "./api";
import type {
  AuthResponse,
  ApiOrganization,
  DashboardOverview,
  MonthlyReport,
  ApiCustomer,
  ApiTransaction,
  PagedResponse,
  ApiReminder,
} from "./api";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined,
);

const AUTH_STORAGE_KEY = "accountu_auth";

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user ?? null);
        setToken(parsed.token ?? null);
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setUser(newUser);
    setToken(newToken);
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: newToken, user: newUser }),
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo(() => ({ user, token, login, logout }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

type OrgContextValue = {
  organizations: ApiOrganization[];
  currentOrg: ApiOrganization | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectOrg: (id: string) => void;
  createOrg: (name: string, currency?: string) => Promise<void>;
};

const OrgContext = React.createContext<OrgContextValue | undefined>(undefined);

const ORG_STORAGE_KEY = "accountu_org";

const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<ApiOrganization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromStorage = () => {
    const stored = window.localStorage.getItem(ORG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ApiOrganization = JSON.parse(stored);
        setCurrentOrg(parsed);
      } catch {
        window.localStorage.removeItem(ORG_STORAGE_KEY);
      }
    }
  };

  const refresh = async () => {
    if (!token) {
      setOrganizations([]);
      setCurrentOrg(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orgs = await getOrganizationsApi(token);
      setOrganizations(orgs);
      if (orgs.length === 0) {
        setCurrentOrg(null);
        window.localStorage.removeItem(ORG_STORAGE_KEY);
      } else {
        const existing = currentOrg
          ? orgs.find((o) => o.id === currentOrg.id)
          : null;
        const next = existing ?? orgs[0];
        setCurrentOrg(next);
        window.localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(next));
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load organizations";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setOrganizations([]);
      setCurrentOrg(null);
      setError(null);
      return;
    }
    loadFromStorage();
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectOrg = (id: string) => {
    const found = organizations.find((o) => o.id === id) || null;
    setCurrentOrg(found);
    if (found) {
      window.localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(found));
    } else {
      window.localStorage.removeItem(ORG_STORAGE_KEY);
    }
  };

  const createOrg = async (name: string, currency?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const org = await createOrganizationApi(token, { name, currency });
      const nextOrgs = [org, ...organizations];
      setOrganizations(nextOrgs);
      setCurrentOrg(org);
      window.localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create organization";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const value: OrgContextValue = {
    organizations,
    currentOrg,
    loading,
    error,
    refresh,
    selectOrg,
    createOrg,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};

const useOrg = () => {
  const ctx = React.useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
};

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (
      (window.localStorage.getItem("accountu_theme") as "light" | "dark") ||
      "light"
    );
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("accountu_theme", theme);
  }, [theme]);

  const toggle = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <button
      className="btn-secondary"
      onClick={toggle}
    >
      {theme === "light" ? "Dark" : "Light"} mode
    </button>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAuthed = !!user;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo">Accountu</span>
          {isAuthed && (
            <nav className="app-nav">
              <Link
                to="/dashboard"
                className={
                  location.pathname.startsWith("/dashboard")
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Dashboard
              </Link>
              <Link
                to="/ledger"
                className={
                  location.pathname.startsWith("/ledger")
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Ledger
              </Link>
              <Link
                to="/settings"
                className={
                  location.pathname.startsWith("/settings")
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Settings
              </Link>
            </nav>
          )}
        </div>
        <div className="app-header-right">
          <ThemeToggle />
          {isAuthed ? (
            <>
              <span className="user-label">{user.name}</span>
              <button
                className="btn-secondary"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn-secondary"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="btn-primary"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="auth-shell">
    <div className="auth-card">
      <div className="auth-header">
        <span className="auth-title">Accountu</span>
        <ThemeToggle />
      </div>

      {children}
    </div>
  </div>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res: AuthResponse = await loginApi({ email, password });
      login(res.token, {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
      });
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to log in. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <h2>Log in</h2>
      <form
        className="form"
        onSubmit={handleSubmit}
      >
        <label className="form-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Password</span>

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <span
              className="toggle-password"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
        </label>
        {error && <div className="form-error">{error}</div>}
        <button
          type="submit"
          className="btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
        <p className="form-footnote">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </PublicLayout>
  );
};

export const SignupPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Name, email, and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res: AuthResponse = await signupApi({ name, email, password });
      login(res.token, {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
      });
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to sign up. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <h2>Create an account</h2>
      <form
        className="form"
        onSubmit={handleSubmit}
      >
        <label className="form-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button
          type="submit"
          className="btn-primary full-width"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
        <p className="form-footnote">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </PublicLayout>
  );
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
};

export const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const { organizations, currentOrg, loading, error, selectOrg, createOrg } =
    useOrg();
  const [newOrgName, setNewOrgName] = useState("");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    void createOrg(newOrgName.trim());
    setNewOrgName("");
  };

  useEffect(() => {
    const load = async () => {
      if (!token || !currentOrg) {
        setOverview(null);
        setMonthly(null);
        setDataError(null);
        return;
      }
      setLoadingData(true);
      setDataError(null);
      try {
        const [ov, mr] = await Promise.all([
          getDashboardOverviewApi(token, currentOrg.id),
          getMonthlyReportApi(token, currentOrg.id),
        ]);
        setOverview(ov);
        setMonthly(mr);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load dashboard data";
        setDataError(msg);
      } finally {
        setLoadingData(false);
      }
    };

    void load();
  }, [token, currentOrg]);
  const getTrend = (monthly: MonthlyReport | null) => {
    if (!monthly || monthly.monthly.length < 2) return null;

    const last = monthly.monthly[monthly.monthly.length - 1];
    const prev = monthly.monthly[monthly.monthly.length - 2];

    const diff = last.net - prev.net;
    const percent = prev.net !== 0 ? (diff / Math.abs(prev.net)) * 100 : 0;

    return {
      value: percent,
      isPositive: percent >= 0,
    };
  };
  const trend = getTrend(monthly);
  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `₹${amount.toLocaleString("en-IN")}`;
    }
  };
  return (
    <AppLayout>
      <section className="page">
        <h1>Dashboard</h1>
        <p>
          Select or create an organization to see ledger, interest, reminders,
          and analytics.
        </p>
        <div className="org-section">
          <div className="org-row">
            <div className="org-select-block">
              <label className="form-field">
                <span>Organization</span>
                <select
                  value={currentOrg?.id ?? ""}
                  onChange={(e) => selectOrg(e.target.value)}
                  disabled={loading || organizations.length === 0}
                >
                  {organizations.length === 0 ? (
                    <option value="">No organizations yet</option>
                  ) : (
                    <>
                      {organizations.map((o) => (
                        <option
                          key={o.id}
                          value={o.id}
                        >
                          {o.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>
              {currentOrg && (
                <div className="org-meta">
                  <span className="org-badge">Active</span>
                  <span className="org-currency">
                    Currency: {currentOrg.currency} (
                    {formatCurrency(1, currentOrg.currency)})
                  </span>
                </div>
              )}
            </div>
            <form
              className="org-create"
              onSubmit={handleCreateOrg}
            >
              <label className="form-field">
                <span>New organization</span>
                <input
                  type="text"
                  placeholder="Business name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="btn-secondary"
                disabled={loading || !newOrgName.trim()}
              >
                Create
              </button>
            </form>
          </div>
          {loading && <p className="muted">Loading organizations…</p>}
          {error && <p className="form-error inline">{error}</p>}
          {loadingData && currentOrg && (
            <p className="muted">Loading dashboard data…</p>
          )}
          {dataError && <p className="form-error inline">{dataError}</p>}
        </div>
        {overview && (
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Total receivable</span>

              <div className="metric-row">
                <span className="metric-value metric-receivable">
                  {formatCurrency(
                    overview.totals.receivable,
                    overview.totals.currency,
                  )}
                </span>

                {trend && (
                  <span
                    className={`metric-trend ${
                      trend.isPositive ? "positive" : "negative"
                    }`}
                  >
                    {trend.isPositive ? "+" : ""}
                    {trend.value.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-label">Total payable</span>
              <span
                className={`metric-value ${
                  overview.totals.payable > 0 ? "metric-payable" : "muted"
                }`}
              >
                {formatCurrency(
                  overview.totals.payable,
                  overview.totals.currency,
                )}
              </span>
              {trend && (
                <span
                  className={`metric-trend ${
                    trend.isPositive ? "positive" : "negative"
                  }`}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="metric-card">
              <span className="metric-label">Interest accrued</span>
              <span className="metric-value metric-interest">
                {formatCurrency(
                  overview.totals.interestAccrued,
                  overview.totals.currency,
                )}
              </span>
              {trend && (
                <span
                  className={`metric-trend ${
                    trend.isPositive ? "positive" : "negative"
                  }`}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
        {monthly && monthly.monthly.length > 0 && (
          <div className="monthly-section">
            <h3>Monthly summary</h3>
            <div className="monthly-list">
              {monthly.monthly.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="monthly-item"
                >
                  <div className="monthly-label">
                    {m.year}-{String(m.month).padStart(2, "0")}
                  </div>
                  <div className="monthly-values">
                    <span className="credit">
                      Credit: {formatCurrency(m.totalCredit, monthly.currency)}
                    </span>
                    <span className="debit">
                      Debit: {formatCurrency(m.totalDebit, monthly.currency)}
                    </span>
                    <span
                      className={m.net >= 0 ? "net positive" : "net negative"}
                    >
                      Net: {formatCurrency(Math.abs(m.net), monthly.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export const LedgerPage: React.FC = () => {
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiCustomer | null>(
    null,
  );
  const [txDate, setTxDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderAmount, setReminderAmount] = useState("");
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newTransactionAmount, setNewTransactionAmount] = useState("");
  const [newTransactionType, setNewTransactionType] = useState<
    "credit" | "debit"
  >("credit");
  const [newTransactionNote, setNewTransactionNote] = useState("");
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const loadCustomers = async (page: number) => {
    if (!token || !currentOrg) return;
    setLoading(true);
    setError(null);
    try {
      const res: PagedResponse<ApiCustomer> = await getCustomersApiPaged(
        token,
        currentOrg.id,
        {
          page,
        },
      );
      setCustomers(res.items);
      setCustomerTotal(res.pagination.total);
      if (!selectedCustomer && res.items.length > 0) {
        setSelectedCustomer(res.items[0]);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load customers";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  const getRunningTransactions = (transactions: ApiTransaction[]) => {
    let running = 0;

    return transactions
      .slice()
      .reverse()
      .map((tx) => {
        if (tx.type === "credit") {
          running -= tx.amount;
        } else {
          running += tx.amount;
        }

        return {
          ...tx,
          runningBalance: running,
        };
      })
      .reverse();
  };
  const txWithBalance = getRunningTransactions(transactions);

  const calculateBalance = (transactions: ApiTransaction[]) => {
    let credit = 0;
    let debit = 0;

    for (const tx of transactions) {
      if (tx.type === "credit") credit += tx.amount;
      else debit += tx.amount;
    }

    return { credit, debit, net: debit - credit };
  };

  const balance = calculateBalance(transactions);
  const handleCreateReminder = async () => {
    if (!token || !currentOrg || !selectedCustomer) return;

    if (!reminderDate) {
      alert("Select date");
      return;
    }
    try {
      setCreatingReminder(true);
      await fetch(
        `/api/orgs/${currentOrg.id}/customers/${selectedCustomer.id}/reminders`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            message: reminderMessage || "Payment reminder",
            dueAmount: Number(reminderAmount) || 0,
            reminderDate,
            repeat,
          }),
        },
      );
      alert("Reminder created");

      setReminderDate("");
      setReminderMessage("");
      setReminderAmount("");
    } catch (err) {
      console.log(err);

      alert("Failed to create reminder");
    } finally {
      setCreatingReminder(false);
    }
  };
  const loadTransactions = async (customer: ApiCustomer | null) => {
    if (!token || !currentOrg || !customer) {
      setTransactions([]);
      return;
    }
    setTxError(null);
    try {
      const res: PagedResponse<ApiTransaction> =
        await getTransactionsByCustomerApi(token, currentOrg.id, customer.id);
      setTransactions(res.items);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load transactions";
      setTxError(msg);
    }
  };

  useEffect(() => {
    void loadCustomers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  useEffect(() => {
    void loadTransactions(selectedCustomer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id, currentOrg?.id]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentOrg || !newCustomerName.trim()) return;
    setError(null);
    try {
      const customer = await createCustomerApi(token, currentOrg.id, {
        name: newCustomerName.trim(),
        email: newCustomerEmail || undefined,
        phone: newCustomerPhone || undefined,
      });
      setCustomers((prev) => [customer, ...prev]);
      setSelectedCustomer(customer);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create customer";
      setError(msg);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentOrg || !selectedCustomer) return;
    const amount = Number(newTransactionAmount);
    if (!amount || amount <= 0) {
      setTxError("Enter a positive amount");
      return;
    }
    setTxError(null);
    try {
      const tx = await createTransactionApi(token, currentOrg.id, {
        customerId: selectedCustomer.id,
        type: newTransactionType,
        amount,
        note: newTransactionNote || undefined,
        transactionDate: txDate ? new Date(txDate).toISOString() : undefined,
      });
      setTransactions((prev) => [tx, ...prev]);
      setNewTransactionAmount("");
      setNewTransactionNote("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add transaction";
      setTxError(msg);
    }
  };

  const loadOrgReminders = async () => {
    if (!token || !currentOrg || !selectedCustomer) return;

    setReminderLoading(true);
    setReminderError(null);

    try {
      const res = await listOrgRemindersApi(token, currentOrg.id, { page: 1 });

      const filtered = res.items.filter(
        (r) => r.customer === selectedCustomer.id,
      );

      setReminders(filtered);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load reminders";
      setReminderError(msg);
    } finally {
      setReminderLoading(false);
    }
  };

  useEffect(() => {
    void loadOrgReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id, selectedCustomer?.id]);

  const handleSendReminder = async () => {
    if (!token || !currentOrg || !selectedCustomer) return;
    setSendingReminder(true);
    setReminderError(null);
    try {
      await sendManualReminderApi(
        token,
        currentOrg.id,
        selectedCustomer.id,
        {},
      );
      await loadOrgReminders();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send reminder";
      setReminderError(msg);
    } finally {
      setSendingReminder(false);
    }
  };

  const handleRunAutoReminders = async () => {
    if (!token || !currentOrg) return;
    setRunningAuto(true);
    setReminderError(null);
    try {
      await runOrgRemindersApi(token, currentOrg.id, {});
      await loadOrgReminders();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to run automatic reminders";
      setReminderError(msg);
    } finally {
      setRunningAuto(false);
    }
  };
  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `₹${amount.toLocaleString("en-IN")}`;
    }
  };
  if (!currentOrg) {
    return (
      <AppLayout>
        <section className="page">
          <h1>Ledger</h1>
          <p>Please create or select an organization first.</p>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <section className="page ledger">
        <h1>Ledger</h1>
        <p className="muted">
          Manage customers and their credit/debit entries for{" "}
          <strong>{currentOrg.name}</strong>.
        </p>
        <div className="ledger-layout">
          <div className="ledger-column">
            <div className="ledger-header">
              <h3>Customers</h3>
              <span className="muted">{customerTotal} total</span>
            </div>
            <form
              className="ledger-create"
              onSubmit={handleCreateCustomer}
            >
              <input
                type="text"
                placeholder="Add customer by name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Phone (recommended)"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
              />
              <button
                type="submit"
                className="btn-secondary"
                disabled={!newCustomerName.trim()}
              >
                Add
              </button>
            </form>
            {loading && <p className="muted">Loading customers…</p>}
            {error && <p className="form-error inline">{error}</p>}
            <ul className="customer-list">
              {customers.map((c) => (
                <li
                  key={c.id}
                  className={
                    selectedCustomer?.id === c.id
                      ? "customer-item active"
                      : "customer-item"
                  }
                  onClick={() => setSelectedCustomer(c)}
                >
                  <div className="customer-name">{c.name}</div>
                  {(c.phone || c.email) && (
                    <div className="customer-meta">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {customers.length === 0 && !loading && (
              <p className="muted">No customers yet. Add your first one.</p>
            )}
          </div>
          <div className="ledger-column">
            <div className="ledger-header">
              <h3>Transactions</h3>
              {selectedCustomer && (
                <span className="muted">for {selectedCustomer.name}</span>
              )}
            </div>
            {selectedCustomer && (
              <form
                className="tx-create"
                onSubmit={handleCreateTransaction}
              >
                <select
                  value={newTransactionType}
                  onChange={(e) =>
                    setNewTransactionType(e.target.value as "credit" | "debit")
                  }
                >
                  <option value="credit">Credit (Udhar)</option>
                  <option value="debit">Debit (Jama)</option>
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newTransactionAmount}
                  onChange={(e) => setNewTransactionAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <input
                  type="datetime-local"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={newTransactionNote}
                  onChange={(e) => setNewTransactionNote(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add entry
                </button>
              </form>
            )}
            {txError && <p className="form-error inline">{txError}</p>}
            <div className="balance-card">
              <div>
                Credit: {formatCurrency(balance.credit, currentOrg.currency)}
              </div>
              <div>
                Debit: {formatCurrency(balance.debit, currentOrg.currency)}
              </div>
              <div>
                Net:{" "}
                {formatCurrency(Math.abs(balance.net), currentOrg.currency)}{" "}
                {balance.net >= 0 ? "(You will get)" : "(You owe)"}
              </div>
            </div>
            <ul className="tx-list">
              {txWithBalance.map((tx) => (
                <li
                  key={tx.id}
                  className={`tx-item ${tx.type}`}
                >
                  {/* Row 1: Type + Amount */}
                  <div className="tx-row top">
                    <span className={`tx-type ${tx.type}`}>
                      {tx.type === "credit" ? "Credit" : "Debit"}
                    </span>

                    <span className="tx-amount">
                      {formatCurrency(tx.amount, currentOrg.currency)}
                    </span>
                  </div>

                  {/* Row 2: Date + Balance */}
                  <div className="tx-row bottom">
                    <span className="tx-date">
                      {new Date(tx.transactionDate).toLocaleString()}
                    </span>

                    <span
                      className={`tx-balance ${
                        Number(tx.runningBalance) >= 0 ? "positive" : "negative"
                      }`}
                    >
                      Balance:{" "}
                      {formatCurrency(
                        Math.abs(tx.runningBalance),
                        currentOrg.currency,
                      )}
                    </span>
                  </div>

                  {/* Row 3: Note */}
                  {tx.note && <div className="tx-note">{tx.note}</div>}
                </li>
              ))}
            </ul>
            {selectedCustomer && transactions.length === 0 && (
              <p className="muted">
                No transactions yet. Add your first entry.
              </p>
            )}
            {!selectedCustomer && (
              <p className="muted">Select a customer to view their ledger.</p>
            )}
          </div>
          <div className="ledger-column">
            <div className="ledger-header">
              <h3>Reminders</h3>
              <span className="muted">per customer & organization</span>
            </div>
            <div className="reminder-actions">
              <div className="card">
                <h4>Schedule Reminder</h4>

                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />

                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                >
                  <option value="none">One time</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>

                <input
                  type="number"
                  placeholder="Amount"
                  value={reminderAmount}
                  onChange={(e) => setReminderAmount(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Message"
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                />

                <button
                  className="btn-primary"
                  onClick={handleCreateReminder}
                  disabled={creatingReminder || !selectedCustomer}
                >
                  {creatingReminder ? "Creating..." : "Create Reminder"}
                </button>
              </div>
              <button
                className="btn-secondary"
                type="button"
                disabled={
                  !selectedCustomer ||
                  sendingReminder ||
                  (!selectedCustomer.email && !selectedCustomer.phone)
                }
                onClick={handleSendReminder}
              >
                {sendingReminder
                  ? "Sending…"
                  : selectedCustomer &&
                      !selectedCustomer.email &&
                      !selectedCustomer.phone
                    ? "No contact info"
                    : "Send reminder"}
              </button>
              {selectedCustomer &&
                !selectedCustomer.phone &&
                !selectedCustomer.email && (
                  <p className="form-error inline">
                    Add phone or email to send reminder
                  </p>
                )}
              <button
                className="btn-secondary"
                type="button"
                disabled={runningAuto}
                onClick={handleRunAutoReminders}
              >
                {runningAuto ? "Running auto…" : "Run automatic reminders"}
              </button>
            </div>
            {reminderLoading && <p className="muted">Loading reminders…</p>}
            {reminderError && (
              <p className="form-error inline">{reminderError}</p>
            )}
            <ul className="reminder-list">
              {reminders.map((r) => (
                <li
                  key={r._id}
                  className="reminder-item"
                >
                  <div className="reminder-row">
                    <span className={`reminder-status ${r.status}`}>
                      {r.isManual ? "Manual" : "Auto"} · {r.status}
                    </span>
                    <span className="reminder-amount">
                      {r.dueAmount.toFixed(2)} {currentOrg.currency}
                    </span>
                  </div>
                  <div className="reminder-row">
                    <span className="reminder-channel">{r.channel}</span>
                    <span className="reminder-date">
                      {r.sentAt
                        ? new Date(r.sentAt).toLocaleString()
                        : r.scheduledAt
                          ? new Date(r.scheduledAt).toLocaleString()
                          : new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {reminders.length === 0 && !reminderLoading && (
              <p className="muted">No reminders logged yet.</p>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const { currentOrg, refresh } = useOrg();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name);
      setCurrency(currentOrg.currency || "INR");
    }
  }, [currentOrg]);

  if (!currentOrg) {
    return (
      <AppLayout>
        <section className="page">
          <h1>Settings</h1>
          <p>Please select or create an organization first.</p>
        </section>
      </AppLayout>
    );
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const cleanCurrency = currency.trim().split(" ")[0];
    try {
      await updateOrganizationApi(token, currentOrg.id, {
        name,
        currency: cleanCurrency,
        logoUrl: logoUrl || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        address: address || undefined,
      });
      await refresh();
      setMessage("Settings updated");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update settings";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <section className="page settings">
        <h1>Organization settings</h1>
        <p className="muted">
          Customize basic details for <strong>{currentOrg.name}</strong>.
        </p>
        <form
          className="settings-form"
          onSubmit={handleSubmit}
        >
          <div className="settings-grid">
            <label className="form-field">
              <span>Organization name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </label>
          </div>
          <div className="settings-grid">
            <label className="form-field">
              <span>Logo URL</span>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </label>
            <label className="form-field">
              <span>Contact phone</span>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </label>
          </div>
          <div className="settings-grid">
            <label className="form-field">
              <span>Contact email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Address</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          </div>
          <div className="settings-actions">
            <button
              className="btn-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {message && <span className="muted">{message}</span>}
            {error && <span className="form-error inline">{error}</span>}
          </div>
        </form>
      </section>
    </AppLayout>
  );
};

export const RootApp: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrgProvider>
          <Routes>
            <Route
              path="/login"
              element={<LoginPage />}
            />
            <Route
              path="/signup"
              element={<SignupPage />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ledger"
              element={
                <ProtectedRoute>
                  <LedgerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />
          </Routes>
        </OrgProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
