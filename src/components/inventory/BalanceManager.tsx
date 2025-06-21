
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Users, Truck, Calendar } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';

interface BalanceManagerProps {
  type: 'customer' | 'vendor';
}

export const BalanceManager: React.FC<BalanceManagerProps> = ({ type }) => {
  const { customers, vendors, balancePayments, addBalancePayment } = useInventoryStore();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [paymentData, setPaymentData] = useState({
    amount: '',
    notes: '',
  });

  const entities = type === 'customer' ? customers : vendors;
  const paymentsForType = balancePayments.filter(p => 
    type === 'customer' ? p.type === 'customer_payment' : p.type === 'vendor_payment'
  );

  const handlePayment = (e: React.FormEvent) => {
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

    addBalancePayment({
      type: type === 'customer' ? 'customer_payment' : 'vendor_payment',
      customerId: type === 'customer' ? selectedId : undefined,
      vendorId: type === 'vendor' ? selectedId : undefined,
      amount,
      date: new Date(),
      notes: paymentData.notes,
    });

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">
          {type === 'customer' ? 'Customer' : 'Vendor'} Balances
        </h3>
      </div>

      {/* Outstanding Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.filter(entity => entity.balance > 0).map((entity) => (
          <Card key={entity.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {type === 'customer' ? (
                  <Users className="h-5 w-5 text-green-600" />
                ) : (
                  <Truck className="h-5 w-5 text-blue-600" />
                )}
                <CardTitle className="text-lg">{entity.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Phone:</span>
                  <span className="text-sm">{entity.phoneNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Outstanding Balance:</span>
                  <span className="font-bold text-red-600">PKR {entity.balance.toFixed(2)}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => openPaymentForm(entity.id)}
                  className="w-full"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {entities.filter(entity => entity.balance > 0).length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No outstanding balances for {type === 'customer' ? 'customers' : 'vendors'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">{type === 'customer' ? 'Customer' : 'Vendor'}</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Notes</th>
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
                        <td className="p-3">{entity?.name || 'N/A'}</td>
                        <td className="p-3 font-semibold text-green-600">PKR {payment.amount.toFixed(2)}</td>
                        <td className="p-3">{payment.notes || '-'}</td>
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

      {/* Payment Form Modal */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label>{type === 'customer' ? 'Customer' : 'Vendor'}</Label>
              <Input
                value={entities.find(e => e.id === selectedId)?.name || ''}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label>Outstanding Balance</Label>
              <Input
                value={`PKR ${entities.find(e => e.id === selectedId)?.balance.toFixed(2) || '0.00'}`}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="amount">Payment Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={entities.find(e => e.id === selectedId)?.balance || 0}
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="Enter payment amount"
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Add any notes about this payment"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
