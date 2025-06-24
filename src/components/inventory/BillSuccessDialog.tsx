import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, X } from 'lucide-react';
import { ExportUtils } from '@/utils/exportUtils';
import { CompletedBatchTransaction } from '@/types';
import { Customer, Vendor } from '@/store/inventoryStore';

interface BillSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: CompletedBatchTransaction | null;
}

export const BillSuccessDialog: React.FC<BillSuccessDialogProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const { type, customer, vendor, customerId, vendorId } = transaction;

  const { customers, vendors } = require('@/store/inventoryStore');
  // Fallback: If customer/vendor is missing, look up by ID
  const resolvedCustomer = customer || (customerId ? customers.find((c: any) => c.id === customerId) : null);
  const resolvedVendor = vendor || (vendorId ? vendors.find((v: any) => v.id === vendorId) : null);
console.log(transaction);
  // For display and bill: decide which to use for returns
  let displayName = '';
  let displayLabel = '';
  if (type === 'sale' || (type === 'return' && customerId)) {
    displayName = resolvedCustomer?.name || 'N/A';
    displayLabel = 'Customer';
  } else if (type === 'purchase' || (type === 'return' && vendorId)) {
    displayName = resolvedVendor?.name || 'N/A';
    displayLabel = 'Vendor';
  }

  const handleDownloadBill = (format: 'excel' | 'pdf') => {
    // Always look up the latest customer/vendor from the store at the time of download
    const latestCustomer = transaction.customerId ? customers.find((c: any) => c.id === transaction.customerId) : null;
    const latestVendor = transaction.vendorId ? vendors.find((v: any) => v.id === transaction.vendorId) : null;
    console.log("Transaction vendorId:", transaction.vendorId);
    console.log("Vendors in store:", vendors);
    console.log("Resolved latestVendor:", latestVendor);
    if (transaction.vendorId && !latestVendor) {
      alert('Vendor not found. Please check vendor data or refresh the page.');
      return;
    }
    ExportUtils.exportTransactionBill(transaction, latestCustomer, latestVendor, format);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">
              {type === 'sale' ? 'Sale Completed!' : 'Purchase Completed!'}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-700 mb-2">
              Transaction has been successfully recorded.
            </p>
            <div className="space-y-1 text-sm">
              <p><strong>Invoice:</strong> {transaction.invoiceNumber}</p>
              <p><strong>Amount:</strong> PKR {(transaction.totalAmount || 0).toFixed(2)}</p>
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
        </CardContent>
      </Card>
    </div>
  );
};
