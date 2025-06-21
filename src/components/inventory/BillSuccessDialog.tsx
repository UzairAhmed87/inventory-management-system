
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, X } from 'lucide-react';
import { ExportUtils } from '@/utils/exportUtils';

interface BillSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  customer?: any;
  vendor?: any;
  type: 'sale' | 'purchase';
}

export const BillSuccessDialog: React.FC<BillSuccessDialogProps> = ({
  isOpen,
  onClose,
  transaction,
  customer,
  vendor,
  type
}) => {
  if (!isOpen) return null;

  const handleDownloadBill = (format: 'excel' | 'pdf') => {
    ExportUtils.exportTransactionBill(transaction, customer, vendor, format);
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
              <p><strong>{type === 'sale' ? 'Customer' : 'Vendor'}:</strong> {customer?.name || vendor?.name}</p>
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
