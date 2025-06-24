import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Users, Truck, Calendar, FileDown } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';
import { ExportUtils } from '@/utils/exportUtils';
import { PaymentSuccessDialog } from './PaymentSuccessDialog';
import { CompletedPayment } from '@/types';
import { log } from 'console';

interface BalanceManagerProps {
  type: 'customer' | 'vendor';
}

export const BalanceManager: React.FC<BalanceManagerProps> = ({ type }) => {
  const { customers, vendors, balancePayments, addBalancePayment, fetchCustomers, fetchVendors, fetchBalancePayments } = useInventoryStore();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [paymentData, setPaymentData] = useState({
    amount: '',
    notes: '',
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [openPaymentCard, setOpenPaymentCard] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const entities = type === 'customer' ? customers : vendors;
  const paymentsForType = balancePayments.filter(p => 
    (type === 'customer' ? p.type === 'customer_payment' : p.type === 'vendor_payment')
  ).filter(p => {
    if (dateFrom && new Date(p.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.date) > new Date(dateTo)) return false;
    return true;
  });

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
    fetchBalancePayments();
  }, [fetchCustomers, fetchVendors, fetchBalancePayments]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedId || !paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const entity = entities.find(e => e.id === selectedId);
    if (!entity) return;

    const amount = parseFloat(paymentData.amount);
    if (amount > entity.balance) {
      toast({
        title: "Error",
        description: `Payment amount cannot exceed outstanding balance of PKR ${entity.balance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    const newPayment = await addBalancePayment({
      type: type === 'customer' ? 'customer_payment' : 'vendor_payment',
      customerId: type === 'customer' ? selectedId : undefined,
      vendorId: type === 'vendor' ? selectedId : undefined,
      amount,
      date: new Date().toISOString(),
      notes: paymentData.notes
      // invoiceNumber: ''
    });

    const entityForDialog = entities.find(e => e.id === selectedId);
    await fetchBalancePayments();

    setCompletedPayment({
      type,
      entity: entityForDialog,
      amount,
      date: newPayment.date,
      notes: paymentData.notes,
      invoiceNumber: newPayment.invoiceNumber,
    });
    setShowSuccessDialog(true);

    toast({
      title: "Success",
      description: `Payment of PKR ${amount.toFixed(2)} recorded successfully`,
    });

    setPaymentData({ amount: '', notes: '' });
    setSelectedId('');
    setShowPaymentForm(false);
  };

  const openPaymentForm = (entityId: string) => {
    setSelectedId(entityId);
    setShowPaymentForm(true);
  };

  const exportPayments = (format: 'excel' | 'pdf') => {
    const data = paymentsForType.map(payment => {
      const entity = entities.find(e => type === 'customer' ? e.id === payment.customerId : e.id === payment.vendorId);
      return {
        Date: new Date(payment.date).toLocaleDateString(),
        'Invoice No': payment.invoiceNumber,
        ID: type === 'customer' ? payment.customerId : payment.vendorId,
        Name: entity?.name || 'N/A',
        Notes: payment.notes || '-',
        Amount: payment.amount,
      };
    });
    if (format === 'excel') {
      ExportUtils.exportToExcel(data, `${type === 'customer' ? 'Customer' : 'Vendor'}_Payments`);
    } else {
      ExportUtils.exportToPDF(data, `${type === 'customer' ? 'Customer' : 'Vendor'} Payments`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold text-gray-900">
          {type === 'customer' ? 'Customer' : 'Vendor'} Payments History
        </h3>
      </div>
      {/* Date Filters */}
      <div className="flex flex-wrap gap-4 items-end mb-2">
        <div>
          <Label htmlFor="dateFrom">From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="min-w-[140px]"
          />
        </div>
        <div>
          <Label htmlFor="dateTo">To</Label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="min-w-[140px]"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => { setDateFrom(''); setDateTo(''); }}
          className="h-10"
        >
          Clear
        </Button>
      </div>
      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {/* <Calendar className="h-5 w-5 mr-2" /> */}
            Recent Payments
            <div className="flex space-x-2">
        <Button
            variant="outline"
            onClick={() => exportPayments('excel')}
            className="bg-green-700 hover:bg-green-100 text-white border-green-200 shadow-sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportPayments('pdf')}
            className="bg-red-700 hover:bg-red-100 text-white border-red-200 shadow-sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
          </CardTitle>
         
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Invoice No</th>
                  <th className="text-left p-3">{type === 'customer' ? 'Customer' : 'Vendor'}</th>
                  <th className="text-left p-3">Notes</th>
                  <th className="text-left p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentsForType
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((payment) => {
                    const entity = entities.find(e => 
                      type === 'customer' ? e.id === payment.customerId : e.id === payment.vendorId
                    );
                    return (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{new Date(payment.date).toLocaleDateString()}</td>
                        <td className="p-3">{payment.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-green-600">{entity?.name || 'N/A'}</td>
                        <td className="p-3">{payment.notes || '-'}</td>
                        <td className="p-3">{payment.amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {paymentsForType.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payment records found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PaymentSuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        payment={completedPayment}
      />
    </div>
  );
};
