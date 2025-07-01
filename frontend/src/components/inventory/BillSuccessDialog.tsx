import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, X } from 'lucide-react';
import { ExportUtils } from '@/utils/exportUtils';
import { CompletedBatchTransaction } from '@/types';
import { useInventoryStore } from '@/store/inventoryStore';
import { apiService } from '@/services/api';
import type { Transaction } from '@/store/inventoryStore';
import { useAuthStore } from '@/store/authStore';

interface BillSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: CompletedBatchTransaction | null;
}

function mapApiTransactionToCompletedBatchTransaction(t: any): CompletedBatchTransaction {
  return {
    id: String(t.id),
    invoiceNumber: t.invoice_number ?? t.invoiceNumber ?? '',
    type: t.type,
    customer_name: t.customer_name ?? '',
    vendor_name: t.vendor_name ?? '',
    items: (t.items ?? []).map((item: any) => ({
      productName: item.product_name ?? item.productName ?? '',
      quantity: item.quantity ?? 0,
      price: item.price ?? item.unit_price ?? 0,
      totalPrice: item.totalPrice ?? item.total_price ?? 0,
    })),
    totalAmount: Number(t.total_amount ?? t.totalAmount ?? 0),
    previousBalance: Number(t.previous_balance ?? t.previousBalance ?? 0),
    newBalance: Number(t.new_balance ?? t.newBalance ?? 0),
    date: t.date ?? null,
    originalTransactionId: t.original_transaction_id ?? t.originalTransactionId ?? undefined,
    customer: t.customer ?? undefined,
    vendor: t.vendor ?? undefined,
  };
}

export const BillSuccessDialog: React.FC<BillSuccessDialogProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const [fetchedTransaction, setFetchedTransaction] = useState<CompletedBatchTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const invoiceNumber = transaction?.invoiceNumber;

  // Always call hooks at the top
  const customers = useInventoryStore((state) => state.customers);
  const vendors = useInventoryStore((state) => state.vendors);
  const companyName = useAuthStore((state) => state.companyName) || useAuthStore((state) => state.currentUser) || 'Company Name';

  useEffect(() => {
    if (isOpen && invoiceNumber) {
      setLoading(true);
      apiService.getTransactionByInvoiceNumber(invoiceNumber)
        .then((data) => setFetchedTransaction(mapApiTransactionToCompletedBatchTransaction(data)))
        .catch(() => setFetchedTransaction(transaction))
        .finally(() => setLoading(false));
    } else {
      setFetchedTransaction(null);
    }
    // eslint-disable-next-line
  }, [isOpen, invoiceNumber]);

  const txn = fetchedTransaction || transaction;
  if (!isOpen || !txn) return null;

  const { type, customer, vendor, customer_name, vendor_name } = txn;

  // Helper function to safely find customer or vendor by name or id
  const findEntity = (
    entities: any[],
    entityName: string | undefined,
    entityObj: any | undefined,
    entityType: 'customer' | 'vendor'
  ) => {
    if (entityObj?.name) return entityObj.name;
    if (entityName) {
      const found = entities.find(
        (e: any) =>
          e.name?.toLowerCase() === entityName?.toLowerCase() ||
          e.id === entityObj?.id
      );
      return found?.name || entityName;
    }
    return 'N/A';
  };

  // Determine display name and label
  let displayName = '';
  let displayLabel = '';
  if (type === 'sale' || (type === 'return' && customer_name)) {
    displayName = findEntity(customers, customer_name, customer, 'customer');
    displayLabel = 'Customer';
  } else if (type === 'purchase' || (type === 'return' && vendor_name)) {
    displayName = findEntity(vendors, vendor_name, vendor, 'vendor');
    displayLabel = 'Vendor';
  }

  const handleDownloadBill = (format: 'excel' | 'pdf') => {
    const latestCustomer = customer
      ? customers.find((c: any) => c.id === customer.id || c.name === customer.name)
      : customer_name
      ? customers.find((c: any) => c.name === customer_name)
      : null;
    const latestVendor = vendor
      ? vendors.find((v: any) => v.id === vendor.id || v.name === vendor.name)
      : vendor_name
      ? vendors.find((v: any) => v.name === vendor_name)
      : null;

    if (txn.vendor && !latestVendor) {
      alert('Vendor not found. Please check vendor data or refresh the page.');
      return;
    }
    if (!txn.items || !Array.isArray(txn.items)) {
      alert('Transaction items are missing. Cannot export bill.');
      return;
    }

    ExportUtils.exportTransactionBill(
      txn,
      latestCustomer || (customer_name ? { id: '', name: customer_name, uniqueId: '', phoneNo: '', balance: 0, createdAt: null } : null),
      latestVendor || (vendor_name ? { id: '', name: vendor_name, uniqueId: '', phoneNo: '', balance: 0, createdAt: null } : null),
      format,
      companyName
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">
              {type === 'sale' ? 'Sale Completed!' : type === 'purchase' ? 'Purchase Completed!' : 'Transaction Completed!'}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading transaction...</div>
          ) : (
            <>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-2">
                  Transaction has been successfully recorded.
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Invoice:</strong> {txn.invoiceNumber}</p>
                  <p><strong>Amount:</strong> PKR {Number(txn.totalAmount || 0).toFixed(2)}</p>
                  <p><strong>{displayLabel}:</strong> {displayName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Download Bill:</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleDownloadBill('pdf')}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => handleDownloadBill('excel')}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>

              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};