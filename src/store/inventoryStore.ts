
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  createdAt: Date;
}

export interface Customer {
  id: string;
  uniqueId: string; // New unique ID field
  name: string;
  phoneNo: string;
  balance: number; // Outstanding balance (positive = they owe us)
  createdAt: Date;
}

export interface Vendor {
  id: string;
  uniqueId: string; // New unique ID field
  name: string;
  phoneNo: string;
  balance: number; // Outstanding balance (positive = we owe them)
  createdAt: Date;
}

export interface Transaction {
  id: string;
  invoiceNumber: string; // New invoice number field
  type: 'sale' | 'purchase';
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
  previousBalance: number; // New field for previous balance
  newBalance: number; // New field for new balance after transaction
  date: Date;
}

export interface BalancePayment {
  id: string;
  type: 'customer_payment' | 'vendor_payment';
  customerId?: string;
  vendorId?: string;
  amount: number;
  date: Date;
  notes?: string;
}

interface InventoryStore {
  products: Product[];
  customers: Customer[];
  vendors: Vendor[];
  transactions: Transaction[];
  balancePayments: BalancePayment[];
  
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'balance' | 'uniqueId'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'balance' | 'uniqueId'>) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  
  addTransaction: (transaction: Omit<Transaction, 'id' | 'invoiceNumber' | 'previousBalance' | 'newBalance'>) => void;
  addBalancePayment: (payment: Omit<BalancePayment, 'id'>) => void;
  
  initializeStore: () => void;
  generateUniqueId: (type: 'customer' | 'vendor') => string;
  generateInvoiceNumber: (type: 'sale' | 'purchase') => string;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      products: [],
      customers: [],
      vendors: [],
      transactions: [],
      balancePayments: [],
      
      generateUniqueId: (type: 'customer' | 'vendor') => {
        const state = get();
        const prefix = type === 'customer' ? 'CUST' : 'VEND';
        const existingIds = type === 'customer' 
          ? state.customers.map(c => c.uniqueId)
          : state.vendors.map(v => v.uniqueId);
        
        let counter = 1;
        let newId = `${prefix}${counter.toString().padStart(4, '0')}`;
        
        while (existingIds.includes(newId)) {
          counter++;
          newId = `${prefix}${counter.toString().padStart(4, '0')}`;
        }
        
        return newId;
      },

      generateInvoiceNumber: (type: 'sale' | 'purchase') => {
        const state = get();
        const prefix = type === 'sale' ? 'INV' : 'PUR';
        const today = new Date();
        const dateStr = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        const todayTransactions = state.transactions.filter(t => 
          t.type === type && 
          new Date(t.date).toDateString() === today.toDateString()
        );
        
        const counter = todayTransactions.length + 1;
        return `${prefix}${dateStr}${counter.toString().padStart(3, '0')}`;
      },
      
      addProduct: (product) => {
        const newProduct: Product = {
          ...product,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
        set((state) => ({
          products: [...state.products, newProduct],
        }));
      },
      
      updateProduct: (id, product) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...product } : p
          ),
        }));
      },
      
      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },
      
      addCustomer: (customer) => {
        const state = get();
        const newCustomer: Customer = {
          ...customer,
          id: crypto.randomUUID(),
          uniqueId: state.generateUniqueId('customer'),
          balance: 0,
          createdAt: new Date(),
        };
        set((state) => ({
          customers: [...state.customers, newCustomer],
        }));
      },
      
      updateCustomer: (id, customer) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...customer } : c
          ),
        }));
      },
      
      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },
      
      addVendor: (vendor) => {
        const state = get();
        const newVendor: Vendor = {
          ...vendor,
          id: crypto.randomUUID(),
          uniqueId: state.generateUniqueId('vendor'),
          balance: 0,
          createdAt: new Date(),
        };
        set((state) => ({
          vendors: [...state.vendors, newVendor],
        }));
      },
      
      updateVendor: (id, vendor) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === id ? { ...v, ...vendor } : v
          ),
        }));
      },
      
      deleteVendor: (id) => {
        set((state) => ({
          vendors: state.vendors.filter((v) => v.id !== id),
        }));
      },
      
      addTransaction: (transaction) => {
        const state = get();
        const invoiceNumber = state.generateInvoiceNumber(transaction.type);
        
        // Get current balance
        let previousBalance = 0;
        if (transaction.type === 'sale' && transaction.customerId) {
          const customer = state.customers.find(c => c.id === transaction.customerId);
          previousBalance = customer?.balance || 0;
        } else if (transaction.type === 'purchase' && transaction.vendorId) {
          const vendor = state.vendors.find(v => v.id === transaction.vendorId);
          previousBalance = vendor?.balance || 0;
        }

        const newBalance = previousBalance + transaction.totalAmount;

        const newTransaction: Transaction = {
          ...transaction,
          id: crypto.randomUUID(),
          invoiceNumber,
          previousBalance,
          newBalance,
        };
        
        set((state) => {
          const updatedProducts = state.products.map((product) => {
            const transactionItem = transaction.items.find(item => item.productId === product.id);
            if (transactionItem) {
              const newQuantity = transaction.type === 'sale' 
                ? product.quantity - transactionItem.quantity
                : product.quantity + transactionItem.quantity;
              return { ...product, quantity: Math.max(0, newQuantity) };
            }
            return product;
          });

          // Update customer/vendor balance
          let updatedCustomers = state.customers;
          let updatedVendors = state.vendors;

          if (transaction.type === 'sale' && transaction.customerId) {
            updatedCustomers = state.customers.map(customer => 
              customer.id === transaction.customerId 
                ? { ...customer, balance: customer.balance + transaction.totalAmount }
                : customer
            );
          } else if (transaction.type === 'purchase' && transaction.vendorId) {
            updatedVendors = state.vendors.map(vendor => 
              vendor.id === transaction.vendorId 
                ? { ...vendor, balance: vendor.balance + transaction.totalAmount }
                : vendor
            );
          }
          
          return {
            transactions: [...state.transactions, newTransaction],
            products: updatedProducts,
            customers: updatedCustomers,
            vendors: updatedVendors,
          };
        });
      },

      addBalancePayment: (payment) => {
        const newPayment: BalancePayment = {
          ...payment,
          id: crypto.randomUUID(),
        };

        set((state) => {
          let updatedCustomers = state.customers;
          let updatedVendors = state.vendors;

          if (payment.type === 'customer_payment' && payment.customerId) {
            updatedCustomers = state.customers.map(customer => 
              customer.id === payment.customerId 
                ? { ...customer, balance: customer.balance - payment.amount }
                : customer
            );
          } else if (payment.type === 'vendor_payment' && payment.vendorId) {
            updatedVendors = state.vendors.map(vendor => 
              vendor.id === payment.vendorId 
                ? { ...vendor, balance: vendor.balance - payment.amount }
                : vendor
            );
          }

          return {
            balancePayments: [...state.balancePayments, newPayment],
            customers: updatedCustomers,
            vendors: updatedVendors,
          };
        });
      },
      
      initializeStore: () => {
        const state = get();
        if (state.products.length === 0) {
          // Add some sample data
          set({
            products: [
              {
                id: '1',
                name: 'Laptop',
                quantity: 25,
                createdAt: new Date(),
              },
              {
                id: '2',
                name: 'Mouse',
                quantity: 100,
                createdAt: new Date(),
              },
              {
                id: '3',
                name: 'Keyboard',
                quantity: 50,
                createdAt: new Date(),
              },
            ],
            customers: [
              {
                id: '1',
                uniqueId: 'CUST0001',
                name: 'John Doe',
                phoneNo: '+1234567890',
                balance: 0,
                createdAt: new Date(),
              },
              {
                id: '2',
                uniqueId: 'CUST0002',
                name: 'Jane Smith',
                phoneNo: '+0987654321',
                balance: 0,
                createdAt: new Date(),
              },
            ],
            vendors: [
              {
                id: '1',
                uniqueId: 'VEND0001',
                name: 'Tech Supplies Inc',
                phoneNo: '+1122334455',
                balance: 0,
                createdAt: new Date(),
              },
              {
                id: '2',
                uniqueId: 'VEND0002',
                name: 'Hardware Solutions',
                phoneNo: '+5544332211',
                balance: 0,
                createdAt: new Date(),
              },
            ],
          });
        }
      },
    }),
    {
      name: 'inventory-store',
    }
  )
);
