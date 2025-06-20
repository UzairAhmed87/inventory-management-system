
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phoneNo: string;
  createdAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  phoneNo: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'purchase';
  customerId?: string;
  vendorId?: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
  date: Date;
}

interface InventoryStore {
  products: Product[];
  customers: Customer[];
  vendors: Vendor[];
  transactions: Transaction[];
  
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  
  initializeStore: () => void;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      products: [],
      customers: [],
      vendors: [],
      transactions: [],
      
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
        const newCustomer: Customer = {
          ...customer,
          id: crypto.randomUUID(),
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
        const newVendor: Vendor = {
          ...vendor,
          id: crypto.randomUUID(),
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
        const newTransaction: Transaction = {
          ...transaction,
          id: crypto.randomUUID(),
        };
        
        set((state) => {
          const updatedProducts = state.products.map((product) => {
            if (product.id === transaction.productId) {
              const newQuantity = transaction.type === 'sale' 
                ? product.quantity - transaction.quantity
                : product.quantity + transaction.quantity;
              return { ...product, quantity: Math.max(0, newQuantity) };
            }
            return product;
          });
          
          return {
            transactions: [...state.transactions, newTransaction],
            products: updatedProducts,
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
                price: 999.99,
                createdAt: new Date(),
              },
              {
                id: '2',
                name: 'Mouse',
                quantity: 100,
                price: 29.99,
                createdAt: new Date(),
              },
              {
                id: '3',
                name: 'Keyboard',
                quantity: 50,
                price: 79.99,
                createdAt: new Date(),
              },
            ],
            customers: [
              {
                id: '1',
                name: 'John Doe',
                phoneNo: '+1234567890',
                createdAt: new Date(),
              },
              {
                id: '2',
                name: 'Jane Smith',
                phoneNo: '+0987654321',
                createdAt: new Date(),
              },
            ],
            vendors: [
              {
                id: '1',
                name: 'Tech Supplies Inc',
                phoneNo: '+1122334455',
                createdAt: new Date(),
              },
              {
                id: '2',
                name: 'Hardware Solutions',
                phoneNo: '+5544332211',
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
