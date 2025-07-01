const API_BASE_URL = import.meta.env.VITE_API_URL;

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export async function login(login_id: string, password: string): Promise<{ token: string, company_name: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  const data = await res.json();
  setAuthToken(data.token);
  return data;
}

export interface Product {
  id: number;
  name: string;
  quantity: number | string; // Can be string from database
  created_at: string;
  updated_at: string;
}

// Helper function to safely convert database values to numbers
export const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  created_at: string;
}

export interface Vendor {
  id: number;
  name: string;
  phone?: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: 'purchase' | 'sale' | 'adjustment';
  product_id: number;
  customer_id?: number;
  vendor_id?: number;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  notes?: string;
  transaction_date: string;
  product_name?: string;
  customer_name?: string;
  vendor_name?: string;
}

export interface DashboardSummary {
  total_products: number;
  low_stock_count: number;
  recent_transactions: Transaction[];
  total_inventory_value: number;
  current_month_sales: number;
  current_month_purchases: number;
  cash_in_hand: number;
}

export interface Payment {
  id: number;
  type: 'customer_payment' | 'vendor_payment';
  customer_name?: string;
  vendor_name?: string;
  amount: number;
  date: string;
  notes?: string;
  invoice_number: string;
  previous_balance?: number;
  new_balance?: number;
}

export interface LedgerEntry {
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface StockReportEntry {
  product_name: string;
  stock: number;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
      ...options,
    };
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Products API
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers API
  async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/customers');
  }

  async getCustomer(id: number): Promise<Customer> {
    return this.request<Customer>(`/customers/${id}`);
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer> {
    return this.request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async deleteCustomer(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Vendors API
  async getVendors(): Promise<Vendor[]> {
    return this.request<Vendor[]>('/vendors');
  }

  async getVendor(id: number): Promise<Vendor> {
    return this.request<Vendor>(`/vendors/${id}`);
  }

  async createVendor(vendor: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor> {
    return this.request<Vendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor),
    });
  }

  async updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor> {
    return this.request<Vendor>(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor),
    });
  }

  async deleteVendor(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/vendors/${id}`, {
      method: 'DELETE',
    });
  }

  // Transactions API
  async getTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>('/transactions');
  }

  async getTransaction(id: number): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}`);
  }

  async getTransactionByInvoiceNumber(invoiceNumber: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/invoice/${invoiceNumber}`);
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'transaction_date'>): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  // Dashboard API
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/transactions/summary/dashboard');
  }

  // Payments API
  async createPayment(payment: Omit<Payment, 'id' | 'invoice_number' | 'previous_balance' | 'new_balance'>): Promise<Payment> {
    return this.request<Payment>('/transactions/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async getPayments(): Promise<Payment[]> {
    return this.request<Payment[]>('/transactions/payments');
  }

  async getCustomerLedger(name: string, from?: string, to?: string): Promise<LedgerEntry[]> {
    const params = [];
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.request<LedgerEntry[]>(`/transactions/ledger/customer/${encodeURIComponent(name)}${query}`);
  }

  async getVendorLedger(name: string, from?: string, to?: string): Promise<LedgerEntry[]> {
    const params = [];
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.request<LedgerEntry[]>(`/transactions/ledger/vendor/${encodeURIComponent(name)}${query}`);
  }

  async getStockReport(date: string): Promise<StockReportEntry[]> {
    const param = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request<StockReportEntry[]>(`/products/stock-report${param}`);
  }

  async getExpenses(): Promise<Expense[]> {
    return this.request<Expense[]>('/transactions/expenses');
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    return this.request<Expense>('/transactions/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  async verifyPassword(login_id: string, password: string): Promise<{ valid: boolean }> {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id, password })
    });
    if (!res.ok) return { valid: false };
    return res.json();
  }
}

export const apiService = new ApiService(); 