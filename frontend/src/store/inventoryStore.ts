import { create } from 'zustand';

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
  customerId?: string;
  vendorId?: string;
  items: {
    productId: string;
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
  customerId?: string;
  vendorId?: string;
  amount: number;
  date: string | null;
  notes?: string;
  invoiceNumber?: string;
  previousBalance?: number;
  newBalance?: number;
}

interface InventoryStore {
  products: Product[];
  customers: Customer[];
  vendors: Vendor[];
  transactions: Transaction[];
  balancePayments: BalancePayment[];

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
}

// Mock data
let productIdCounter = 3;
let customerIdCounter = 2;
let vendorIdCounter = 2;
let invoiceCounter = 1;

const mockProducts: Product[] = [
  { id: '1', name: 'Product A', quantity: 100, createdAt: null },
  { id: '2', name: 'Product B', quantity: 50, createdAt: null },
  { id: '3', name: 'Product C', quantity: 75, createdAt: null },
];

const mockCustomers: Customer[] = [
  { id: '1', uniqueId: 'CUST001', name: 'Alice', phoneNo: '1234567890', balance: 300, createdAt: null },
];

const mockVendors: Vendor[] = [
  { id: '1', uniqueId: 'VEND001', name: 'Vendor X', phoneNo: '1112223333', balance: 500, createdAt: null },
];

const mockTransactions: Transaction[] = [
  {
    id: 'T1',
    invoiceNumber: 'INV20240601001',
    type: 'sale',
    customerId: '1',
    items: [
      { productId: '1', productName: 'Product A', quantity: 5, price: 100, totalPrice: 500 },
    ],
    totalAmount: 500,
    previousBalance: 0,
    newBalance: 500,
    date: new Date().toISOString(),
  },
  {
    id: 'T2',
    invoiceNumber: 'INV20240601002',
    type: 'purchase',
    vendorId: '1',
    items: [
      { productId: '1', productName: 'Product A', quantity: 10, price: 50, totalPrice: 500 },
    ],
    totalAmount: 500,
    previousBalance: 0,
    newBalance: 500,
    date: new Date().toISOString(),
  },
];

const mockBalancePayments: BalancePayment[] = [
  {
    id: 'P1',
    type: 'customer_payment',
    customerId: '1',
    amount: 200,
    date: new Date().toISOString(),
    notes: 'Test payment for Alice',
    invoiceNumber: 'PAY20240601001',
    previousBalance: 500,
    newBalance: 300,
  },
  {
    id: 'P2',
    type: 'vendor_payment',
    vendorId: '1',
    amount: 100,
    date: new Date().toISOString(),
    notes: 'Test payment for Vendor X',
    invoiceNumber: 'PAY20240601002',
    previousBalance: 500,
    newBalance: 400,
  },
];

export const useInventoryStore = create<InventoryStore>()((set, get) => ({
  products: mockProducts,
  customers: mockCustomers,
  vendors: mockVendors,
  transactions: mockTransactions,
  balancePayments: mockBalancePayments,

  fetchProducts: async () => {
    set({ products: get().products });
    return Promise.resolve();
  },
  addProduct: async (product) => {
    const newProduct: Product = {
      ...product,
      id: (++productIdCounter).toString(),
      createdAt: new Date().toISOString(),
    };
    set(state => ({ products: [...state.products, newProduct] }));
    return Promise.resolve();
  },
  updateProduct: async (id, product) => {
    set(state => ({
      products: state.products.map(p => p.id === id ? { ...p, ...product } : p)
    }));
    return Promise.resolve();
  },
  deleteProduct: async (id) => {
    set(state => ({ products: state.products.filter(p => p.id !== id) }));
    return Promise.resolve();
  },

  fetchCustomers: async () => {
    set({ customers: get().customers });
    return Promise.resolve();
  },
  addCustomer: async (customer) => {
    const newCustomer: Customer = {
      ...customer,
      id: (++customerIdCounter).toString(),
      uniqueId: `CUST${(customerIdCounter).toString().padStart(3, '0')}`,
      balance: 0,
      createdAt: new Date().toISOString(),
    };
    set(state => ({ customers: [...state.customers, newCustomer] }));
    return Promise.resolve();
  },
  updateCustomer: async (id, customer) => {
    set(state => ({
      customers: state.customers.map(c => c.id === id ? { ...c, ...customer } : c)
    }));
    return Promise.resolve();
  },
  deleteCustomer: async (id) => {
    set(state => ({ customers: state.customers.filter(c => c.id !== id) }));
    return Promise.resolve();
  },

  fetchVendors: async () => {
    set({ vendors: get().vendors });
    return Promise.resolve();
  },
  addVendor: async (vendor) => {
    const newVendor: Vendor = {
      ...vendor,
      id: (++vendorIdCounter).toString(),
      uniqueId: `VEND${(vendorIdCounter).toString().padStart(3, '0')}`,
      balance: 0,
      createdAt: new Date().toISOString(),
    };
    set(state => ({ vendors: [...state.vendors, newVendor] }));
    return Promise.resolve();
  },
  updateVendor: async (id, vendor) => {
    set(state => ({
      vendors: state.vendors.map(v => v.id === id ? { ...v, ...vendor } : v)
    }));
    return Promise.resolve();
  },
  deleteVendor: async (id) => {
    set(state => ({ vendors: state.vendors.filter(v => v.id !== id) }));
    return Promise.resolve();
  },

  fetchTransactions: async () => {
    set({ transactions: get().transactions });
    return Promise.resolve();
  },
  addTransaction: async (transaction) => {
    const invoiceNumber = await get().generateInvoiceNumber(transaction.type);
    const id = crypto.randomUUID();
    let previousBalance = 0;
    let newBalance = 0;
    if (transaction.type === 'sale' && transaction.customerId) {
      const customer = get().customers.find(c => c.id === transaction.customerId);
      previousBalance = customer?.balance || 0;
      newBalance = previousBalance + transaction.totalAmount;
      set(state => ({
        customers: state.customers.map(c => c.id === transaction.customerId ? { ...c, balance: newBalance } : c)
      }));
    } else if (transaction.type === 'purchase' && transaction.vendorId) {
      const vendor = get().vendors.find(v => v.id === transaction.vendorId);
      previousBalance = vendor?.balance || 0;
      newBalance = previousBalance + transaction.totalAmount;
      set(state => ({
        vendors: state.vendors.map(v => v.id === transaction.vendorId ? { ...v, balance: newBalance } : v)
      }));
    } else if (transaction.type === 'return' && transaction.customerId) {
      // For returns, decrease customer balance and increase product stock
      const customer = get().customers.find(c => c.id === transaction.customerId);
      previousBalance = customer?.balance || 0;
      newBalance = previousBalance - transaction.totalAmount;
      set(state => ({
        customers: state.customers.map(c => c.id === transaction.customerId ? { ...c, balance: newBalance } : c)
      }));
    }
    // Update product stock
    transaction.items.forEach(item => {
      set(state => ({
        products: state.products.map(p =>
          p.id === item.productId
            ? {
                ...p,
                quantity:
                  transaction.type === 'sale'
                    ? p.quantity - item.quantity
                    : transaction.type === 'purchase'
                    ? p.quantity + item.quantity
                    : transaction.type === 'return'
                    ? p.quantity + item.quantity // returned products go back to stock
                    : p.quantity
              }
            : p
        )
      }));
    });
    const newTransaction: Transaction = {
      ...transaction,
      id,
      invoiceNumber,
      previousBalance,
      newBalance,
      date: new Date().toISOString(),
    };
    set(state => ({ transactions: [...state.transactions, newTransaction] }));
    return newTransaction;
  },

  fetchBalancePayments: async () => {
    set({ balancePayments: get().balancePayments });
    return Promise.resolve();
  },
  addBalancePayment: async (payment) => {
    const id = crypto.randomUUID();
    const invoiceNumber = await get().generateInvoiceNumber('payment');
    const newPayment: BalancePayment = {
      ...payment,
      id,
      date: new Date().toISOString(),
      invoiceNumber,
    };
    console.log('Generated Payment:', newPayment);
    if (payment.type === 'customer_payment' && payment.customerId) {
      const customer = get().customers.find(c => c.id === payment.customerId);
      const newBalance = (customer?.balance || 0) - payment.amount;
      set(state => ({
        customers: state.customers.map(c => c.id === payment.customerId ? { ...c, balance: newBalance } : c)
      }));
    } else if (payment.type === 'vendor_payment' && payment.vendorId) {
      const vendor = get().vendors.find(v => v.id === payment.vendorId);
      const newBalance = (vendor?.balance || 0) - payment.amount;
      set(state => ({
        vendors: state.vendors.map(v => v.id === payment.vendorId ? { ...v, balance: newBalance } : v)
      }));
    }
    set(state => ({ balancePayments: [...state.balancePayments, newPayment] }));
    return newPayment;
  },

  generateUniqueId: async (type: 'customer' | 'vendor') => {
    if (type === 'customer') {
      customerIdCounter++;
      return `CUST${customerIdCounter.toString().padStart(3, '0')}`;
    } else {
      vendorIdCounter++;
      return `VEND${vendorIdCounter.toString().padStart(3, '0')}`;
    }
  },
  generateInvoiceNumber: async (type: 'sale' | 'purchase' | 'return' | 'payment') => {
    if (type === 'sale') {
      return `INV${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(invoiceCounter++).toString().padStart(3, '0')}`;
    } else if (type === 'purchase') {
      return `PUR${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(invoiceCounter++).toString().padStart(3, '0')}`;
    } else if (type === 'return') {
      return `RET${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(invoiceCounter++).toString().padStart(3, '0')}`;
    } else if (type === 'payment') {
      return `PAY${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(invoiceCounter++).toString().padStart(3, '0')}`;
    }
    return `INV${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(invoiceCounter++).toString().padStart(3, '0')}`;
  },

  /**
   * Update an existing transaction (bill), reverting the old effects and applying the new ones.
   */
  updateTransaction: async (id, updatedTransaction) => {
    const state = get();
    const oldTransaction = state.transactions.find(t => t.id === id);
    if (!oldTransaction) return;

    // 1. Revert old transaction effects
    // Revert product stock
    oldTransaction.items.forEach(item => {
      set(state => ({
        products: state.products.map(p =>
          p.id === item.productId
            ? {
                ...p,
                quantity:
                  oldTransaction.type === 'sale'
                    ? p.quantity + item.quantity
                    : oldTransaction.type === 'purchase'
                    ? p.quantity - item.quantity
                    : oldTransaction.type === 'return'
                    ? p.quantity - item.quantity
                    : p.quantity
              }
            : p
        )
      }));
    });
    // Revert balances
    if (oldTransaction.type === 'sale' && oldTransaction.customerId) {
      set(state => ({
        customers: state.customers.map(c =>
          c.id === oldTransaction.customerId
            ? { ...c, balance: c.balance - oldTransaction.totalAmount }
            : c
        )
      }));
    } else if (oldTransaction.type === 'purchase' && oldTransaction.vendorId) {
      set(state => ({
        vendors: state.vendors.map(v =>
          v.id === oldTransaction.vendorId
            ? { ...v, balance: v.balance - oldTransaction.totalAmount }
            : v
        )
      }));
    } else if (oldTransaction.type === 'return' && oldTransaction.customerId) {
      set(state => ({
        customers: state.customers.map(c =>
          c.id === oldTransaction.customerId
            ? { ...c, balance: c.balance + oldTransaction.totalAmount }
            : c
        )
      }));
    }

    // 2. Apply new transaction effects
    // Update product stock
    updatedTransaction.items.forEach(item => {
      set(state => ({
        products: state.products.map(p =>
          p.id === item.productId
            ? {
                ...p,
                quantity:
                  updatedTransaction.type === 'sale'
                    ? p.quantity - item.quantity
                    : updatedTransaction.type === 'purchase'
                    ? p.quantity + item.quantity
                    : updatedTransaction.type === 'return'
                    ? p.quantity + item.quantity
                    : p.quantity
              }
            : p
        )
      }));
    });
    // Update balances
    if (updatedTransaction.type === 'sale' && updatedTransaction.customerId) {
      set(state => ({
        customers: state.customers.map(c =>
          c.id === updatedTransaction.customerId
            ? { ...c, balance: c.balance + updatedTransaction.totalAmount }
            : c
        )
      }));
    } else if (updatedTransaction.type === 'purchase' && updatedTransaction.vendorId) {
      set(state => ({
        vendors: state.vendors.map(v =>
          v.id === updatedTransaction.vendorId
            ? { ...v, balance: v.balance + updatedTransaction.totalAmount }
            : v
        )
      }));
    } else if (updatedTransaction.type === 'return' && updatedTransaction.customerId) {
      set(state => ({
        customers: state.customers.map(c =>
          c.id === updatedTransaction.customerId
            ? { ...c, balance: c.balance - updatedTransaction.totalAmount }
            : c
        )
      }));
    }

    // 3. Update the transaction record
    set(state => ({
      transactions: state.transactions.map(t =>
        t.id === id
          ? {
              ...t,
              ...updatedTransaction,
              id: t.id, // keep original id
              invoiceNumber: t.invoiceNumber, // keep original invoice number
              previousBalance: t.previousBalance, // optionally update if needed
              newBalance: t.newBalance, // optionally update if needed
            }
          : t
      )
    }));
    return Promise.resolve();
  },
}));
