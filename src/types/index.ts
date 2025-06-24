import type { Customer, Vendor, Transaction } from '@/store/inventoryStore';

export interface CompletedPayment {
  type: 'customer' | 'vendor';
  entity: Customer | Vendor | undefined;
  amount: number;
  date: string;
  notes: string;
  invoiceNumber: string;
}

export interface CompletedBatchTransaction extends Transaction {
  customer?: Customer;
  vendor?: Vendor;
}

export interface LedgerEntry {
  Date: string;
  Description: string;
  Debit: string;
  Credit: string;
  Balance: string;
}

export interface BalancePayment {
  id: string;
  type: 'customer_payment' | 'vendor_payment';
  customerId?: string;
  vendorId?: string;
  amount: number;
  date: string | null;
  notes?: string;
  invoiceNumber: string;
  previousBalance?: number;
  newBalance?: number;
} 