import { create } from 'zustand';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ExportUtils } from '@/utils/exportUtils';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  createdAt: string | null;
}

export interface Customer {
  id: string;
  uniqueId: string;
  name: string;
  phoneNo: string;
  balance: number;
  createdAt: string | null;
}

export interface Vendor {
  id: string;
  uniqueId: string;
  name: string;
  phoneNo: string;
  balance: number;
  createdAt: string | null;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  type: 'sale' | 'purchase' | 'return';
  customer_name?: string;
  vendor_name?: string;
  items: {
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  previousBalance: number;
  newBalance: number;
  date: string | null;
  originalTransactionId?: string;
}

export interface BalancePayment {
  id: string;
  type: 'customer_payment' | 'vendor_payment';
  customer_name?: string;
  vendor_name?: string;
  amount: number;
  date: string | null;
  notes?: string;
  invoiceNumber?: string;
  previousBalance?: number;
  newBalance?: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
}

interface InventoryStore {
  products: Product[];
  customers: Customer[];
  vendors: Vendor[];
  transactions: Transaction[];
  balancePayments: BalancePayment[];
  expenses: Expense[];
  globalLoader: boolean;

  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'balance' | 'uniqueId'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  fetchVendors: () => Promise<void>;
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'balance' | 'uniqueId'>) => Promise<void>;
  updateVendor: (id: string, vendor: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'invoiceNumber' | 'previousBalance' | 'newBalance'>) => Promise<Transaction>;

  fetchBalancePayments: () => Promise<void>;
  addBalancePayment: (payment: Omit<BalancePayment, 'id'>) => Promise<BalancePayment>;

  generateUniqueId: (type: 'customer' | 'vendor') => Promise<string>;
  generateInvoiceNumber: (type: 'sale' | 'purchase' | 'return' | 'payment') => Promise<string>;

  /**
   * Update an existing transaction (bill), reverting the old effects and applying the new ones.
   */
  updateTransaction: (id: string, updatedTransaction: Omit<Transaction, 'id' | 'invoiceNumber' | 'previousBalance' | 'newBalance'>) => Promise<void>;

  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;

  setGlobalLoader: (loading: boolean) => void;
}

// --- Mapping functions for API <-> Store types ---
function mapApiProductToStore(p: any): Product {
  return {
    id: String(p.id),
    name: p.name,
    quantity: p.quantity,
    createdAt: p.createdAt ?? null,
  };
}
function mapStoreProductToApi(p: Partial<Product>): any {
  return {
    ...p,
    id: p.id ? Number(p.id) : undefined,
  };
}
function mapApiCustomerToStore(c: any): Customer {
  return {
    id: String(c.id),
    uniqueId: c.uniqueId ?? '',
    name: c.name,
    phoneNo: c.phoneNo ?? c.phone ?? '',
    balance: c.balance ?? 0,
    createdAt: c.createdAt ?? null,
  };
}
function mapStoreCustomerToApi(c: Partial<Customer>): any {
  return {
    ...c,
    id: c.id ? Number(c.id) : undefined,
    phone: c.phoneNo,
  };
}
function mapApiVendorToStore(v: any): Vendor {
  return {
    id: String(v.id),
    uniqueId: v.uniqueId ?? '',
    name: v.name,
    phoneNo: v.phoneNo ?? v.phone ?? '',
    balance: Number(v.balance ?? 0),
    createdAt: v.createdAt ?? null,
  };
}
function mapStoreVendorToApi(v: Partial<Vendor>): any {
  return {
    ...v,
    id: v.id ? Number(v.id) : undefined,
    phone: v.phoneNo,
  };
}
function mapApiTransactionToStore(t: any): Transaction {
  return {
    id: String(t.id),
    invoiceNumber: t.invoice_number ?? t.invoiceNumber ?? '',
    type: t.type,
    customer_name: t.customer_name ?? '',
    vendor_name: t.vendor_name ?? '',
    items: (t.items ?? []).map((item: any) => ({
      productName: item.product_name ?? item.productName ?? '',
      quantity: item.quantity ?? 0,
      price: item.price ?? 0,
      totalPrice: item.total_price ?? item.totalPrice ?? 0,
    })),
    totalAmount: Number(t.total_amount ?? t.totalAmount ?? 0),
    previousBalance: Number(t.previous_balance ?? t.previousBalance ?? 0),
    newBalance: Number(t.new_balance ?? t.newBalance ?? 0),
    date: t.date ?? null,
    originalTransactionId: t.original_transaction_id ?? t.originalTransactionId ?? undefined,
  };
}
function mapStoreTransactionToApi(t: Partial<Transaction>): any {
  return {
    ...t,
    id: t.id ? Number(t.id) : undefined,
  };
}
function mapApiPaymentToStore(p: any): BalancePayment {
  return {
    id: String(p.id),
    type: p.type,
    customer_name: p.customer_name ?? '',
    vendor_name: p.vendor_name ?? '',
    amount: Number(p.amount ?? 0),
    date: p.date ?? null,
    notes: p.notes ?? '',
    invoiceNumber: p.invoice_number ?? '',
    previousBalance: Number(p.previous_balance ?? 0),
    newBalance: Number(p.new_balance ?? 0),
  };
}
function mapApiExpenseToStore(e: any): Expense {
  return {
    id: String(e.id),
    amount: Number(e.amount),
    description: e.description,
    date: e.date,
  };
}
// --- End mapping functions ---

export const useInventoryStore = create<InventoryStore>()((set, get) => ({
  products: [],
  customers: [],
  vendors: [],
  transactions: [],
  balancePayments: [],
  expenses: [],
  globalLoader: false,

  fetchProducts: async () => {
    const productsFromApi = await apiService.getProducts();
    const products = productsFromApi.map(mapApiProductToStore);
    set({ products });
  },
  addProduct: async (product) => {
    await apiService.createProduct(mapStoreProductToApi(product));
    await get().fetchProducts();
  },
  updateProduct: async (id, product) => {
    await apiService.updateProduct(Number(id), mapStoreProductToApi(product));
    await get().fetchProducts();
  },
  deleteProduct: async (id) => {
    await apiService.deleteProduct(Number(id));
    await get().fetchProducts();
  },

  fetchCustomers: async () => {
    const customersFromApi = await apiService.getCustomers();
    const customers = customersFromApi.map(mapApiCustomerToStore);
    set({ customers });
  },
  addCustomer: async (customer) => {
    await apiService.createCustomer(mapStoreCustomerToApi(customer));
    await get().fetchCustomers();
  },
  updateCustomer: async (id, customer) => {
    await apiService.updateCustomer(Number(id), mapStoreCustomerToApi(customer));
    await get().fetchCustomers();
  },
  deleteCustomer: async (id) => {
    await apiService.deleteCustomer(Number(id));
    await get().fetchCustomers();
  },

  fetchVendors: async () => {
    const vendorsFromApi = await apiService.getVendors();
    const vendors = vendorsFromApi.map(mapApiVendorToStore);
    set({ vendors });
  },
  addVendor: async (vendor) => {
    await apiService.createVendor(mapStoreVendorToApi(vendor));
    await get().fetchVendors();
  },
  updateVendor: async (id, vendor) => {
    await apiService.updateVendor(Number(id), mapStoreVendorToApi(vendor));
    await get().fetchVendors();
  },
  deleteVendor: async (id) => {
    await apiService.deleteVendor(Number(id));
    await get().fetchVendors();
  },

  fetchTransactions: async () => {
    const transactionsFromApi = await apiService.getTransactions();
    const transactions = transactionsFromApi.map(mapApiTransactionToStore);
    set({ transactions });
  },
  addTransaction: async (transaction) => {
    try {
      const apiTransaction = mapStoreTransactionToApi(transaction);
      const newTransactionFromApi = await apiService.createTransaction(apiTransaction);
      const newTransaction = mapApiTransactionToStore(newTransactionFromApi);
      await get().fetchTransactions();
      return newTransaction;
    } catch (err: any) {
      // Surface backend error to the UI
      throw new Error(err?.message || err?.toString() || 'Transaction failed');
    }
  },

  fetchBalancePayments: async () => {
    const paymentsFromApi = await apiService.getPayments();
    const balancePayments = paymentsFromApi.map(mapApiPaymentToStore);
    set({ balancePayments });
  },
  addBalancePayment: async (payment) => {
    // Remove invoiceNumber, previousBalance, newBalance for backend
    const { invoiceNumber, previousBalance, newBalance, ...apiPayment } = payment;
    const newPaymentFromApi = await apiService.createPayment(apiPayment);
    const newPayment = mapApiPaymentToStore(newPaymentFromApi);
    await get().fetchBalancePayments();
    return newPayment;
  },

  generateUniqueId: async (type: 'customer' | 'vendor') => {
    if (type === 'customer') {
      const customers = await apiService.getCustomers();
      return String(customers[customers.length - 1].id);
    } else {
      const vendors = await apiService.getVendors();
      return String(vendors[vendors.length - 1].id);
    }
  },
  generateInvoiceNumber: async (type: 'sale' | 'purchase' | 'return' | 'payment') => {
    const transactions = (await apiService.getTransactions()).map(mapApiTransactionToStore);
    if (type === 'sale') {
      return transactions[transactions.length - 1]?.invoiceNumber ?? '';
    } else if (type === 'purchase') {
      return transactions[transactions.length - 2]?.invoiceNumber ?? '';
    } else if (type === 'return') {
      return transactions[transactions.length - 3]?.invoiceNumber ?? '';
    } else if (type === 'payment') {
      return transactions[transactions.length - 4]?.invoiceNumber ?? '';
    }
    return transactions[transactions.length - 1]?.invoiceNumber ?? '';
  },

  /**
   * Update an existing transaction (bill), reverting the old effects and applying the new ones.
   */
  updateTransaction: async (id, updatedTransaction) => {
    // No update endpoint available; just refresh transactions
    await get().fetchTransactions();
  },

  fetchExpenses: async () => {
    const expensesFromApi = await apiService.getExpenses();
    const expenses = expensesFromApi.map(mapApiExpenseToStore);
    set({ expenses });
  },
  addExpense: async (expense) => {
    await apiService.addExpense(expense);
    await get().fetchExpenses();
  },

  setGlobalLoader: (loading: boolean) => set({ globalLoader: loading }),
}));
