import React, { useState, useEffect, ComponentType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, Truck, FileDown, Search } from 'lucide-react';
import { useInventoryStore, Vendor } from '@/store/inventoryStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExportUtils } from '@/utils/exportUtils';
import { PaymentSuccessDialog } from './PaymentSuccessDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LedgerPDF } from './LedgerPDF';
import { PdfExportButton } from './PdfExportButton';
import { CompletedPayment } from '@/types';
import {toast} from 'sonner';
import { MonthlySummaryPDF } from './MonthlySummaryPDF';

export const VendorSection = () => {
  const { vendors, addVendor, updateVendor, deleteVendor, transactions, fetchVendors, fetchTransactions, addBalancePayment, balancePayments, fetchBalancePayments } = useInventoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phoneNo: '',
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openPaymentCard, setOpenPaymentCard] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({ amount: '', notes: '' });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [monthlySummaryVendor, setMonthlySummaryVendor] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
    fetchTransactions();
    fetchBalancePayments();
  }, [fetchVendors, fetchTransactions, fetchBalancePayments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phoneNo) return;

    if (editingVendor) {
      await updateVendor(editingVendor, formData);
      setEditingVendor(null);
    } else {
      await addVendor(formData);
    }

    setFormData({ name: '', phoneNo: '' });
    setShowForm(false);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor.id);
    setFormData({
      name: vendor.name,
      phoneNo: vendor.phoneNo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      await deleteVendor(id);
    }
  };

  const resetFormData = () => {
    setFormData({ name: '', phoneNo: '' });
    setEditingVendor(null);
    setShowForm(false);
  };

  const getVendorLedger = (vendorId: string) => {
    const vendorTransactions = transactions
      .filter(t => t.vendorId === vendorId && (t.type === 'purchase' || t.type === 'return'))
      .filter(t => {
        if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
        return true;
      });

    const vendorPayments = balancePayments
      .filter(p => p.vendorId === vendorId && p.type === 'vendor_payment')
      .filter(p => {
        if (dateFrom && new Date(p.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(p.date) > new Date(dateTo)) return false;
        return true;
      });

    const ledgerEntries = [
      ...vendorTransactions.map(t => {
        let desc = t.items.length > 1
          ? t.items.map(item => `${item.productName} x ${item.quantity} @ ${item.price.toFixed(2)}`)
          : `${t.items[0].productName} x ${t.items[0].quantity} @ ${t.items[0].price.toFixed(2)}`;
        if (t.type === 'purchase') {
          desc = Array.isArray(desc) ? desc : [desc];
          desc.unshift(`Purchase Invoice: ${t.invoiceNumber}`);
        } else if (t.type === 'return') {
          desc = Array.isArray(desc) ? desc : [desc];
          desc.unshift(`Return Invoice: ${t.invoiceNumber}`);
        }
        return {
          date: new Date(t.date),
          description: desc,
          debit: t.type === 'purchase' ? t.totalAmount : 0,
          credit: t.type === 'return' ? t.totalAmount : 0,
        };
      }),
      ...vendorPayments.map(p => ({
        date: new Date(p.date),
        description: [`Payment${p.notes ? `: ${p.notes}` : ''}`, `Payment Invoice: ${p.invoiceNumber}`],
        debit: 0,
        credit: p.amount,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    return ledgerEntries.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });
  };

  const exportVendorLedgerData = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return null;

    const ledger = getVendorLedger(vendorId);

    return ledger.map(entry => ({
      Date: entry.date.toLocaleDateString(),
      Description: Array.isArray(entry.description) ? entry.description.join('\n') : entry.description,
      Debit: entry.debit > 0 ? `PKR ${entry.debit.toFixed(2)}` : '',
      Credit: entry.credit > 0 ? `PKR ${entry.credit.toFixed(2)}` : '',
      Balance: `PKR ${entry.balance.toFixed(2)}`,
    }));
  };

  const handlePayment = async (e: React.FormEvent, vendor: Vendor) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0 || !paymentData.notes) return;
    const amount = parseFloat(paymentData.amount);
    if (amount > vendor.balance) return;
    try {
      // Call addBalancePayment without invoiceNumber to let inventoryStore generate it
      const newPayment = await addBalancePayment({
        type: 'vendor_payment',
        vendorId: vendor.id,
        amount,
        notes: paymentData.notes,
        date: new Date().toISOString(), // Set date here
      });

      console.log('New Payment:', newPayment); // Debug log

      // Set completedPayment with the generated invoiceNumber
      setCompletedPayment({
        type: 'vendor',
        entity: vendor,
        amount,
        date: newPayment.date,
        notes: paymentData.notes,
        invoiceNumber: newPayment.invoiceNumber, // Use the generated invoiceNumber
      });

      setShowSuccessDialog(true);
      setPaymentData({ amount: '', notes: '' });
      setOpenPaymentCard(null);

      toast("Payment of PKR " + amount.toFixed(2) + " recorded successfully");
    } catch (error) {
      console.error('Error recording payment:', error);
      toast("Failed to record payment. Please try again.");
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phoneNo.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Vendors</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Vendor Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNo">Phone Number</Label>
                <Input
                  id="phoneNo"
                  value={formData.phoneNo}
                  onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetFormData}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVendor ? 'Update' : 'Add'} Vendor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">{vendor.name}</CardTitle>
              </div>
              <div className="flex space-x-1 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedVendor(vendor.id);
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Ledger
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(vendor)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(vendor.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMonthlySummaryVendor(vendor.id)}
                >
                  Monthly Summary
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-sm text-gray-600">Phone: {vendor.phoneNo}</p>
                  <p className="text-sm text-gray-600">
                    Purchases: {transactions.filter(t => t.vendorId === vendor.id && t.type === 'purchase').length}
                  </p>
                  {vendor.balance > 0 && (
                    <p className="text-sm text-green-600">
                      Balance: PKR {vendor.balance.toFixed(2)}
                    </p>
                  )}
                </div>
                {vendor.balance > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenPaymentCard(openPaymentCard === vendor.id ? null : vendor.id)}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
              {openPaymentCard === vendor.id && (
                <form onSubmit={(e) => handlePayment(e, vendor)} className="space-y-3 mt-3 bg-gray-50 p-3 rounded border">
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="paymentAmount">Amount (PKR)</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                        max={vendor.balance}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentNotes">Notes</Label>
                      <Input
                        id="paymentNotes"
                        placeholder="Payment reason"
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                        required
                        maxLength={50}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Save Payment
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {vendors.length === 0 
                ? "No vendors found. Add your first vendor to get started."
                : "No vendors match your search criteria."
              }
            </p>
          </CardContent>
        </Card>
      )}

      <PaymentSuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        payment={completedPayment}
      />

      <Dialog open={!!selectedVendor} onOpenChange={(isOpen) => !isOpen && setSelectedVendor(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Ledger for {vendors.find((v) => v.id === selectedVendor)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div>
              <Label htmlFor="dateFrom">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end space-x-2">
              {selectedVendor && (
                <PdfExportButton
                  document={
                    <LedgerPDF 
                      data={exportVendorLedgerData(selectedVendor) || []}
                      title={`${vendors.find(v => v.id === selectedVendor)?.name} - Ledger`}
                      subtitle={`Date Range: ${(dateFrom && dateTo) ? `${dateFrom} to ${dateTo}` : 'All Time'}`}
                      companyName='Company Name'
                    />
                  }
                  fileName={`${vendors.find(v => v.id === selectedVendor)?.name}_Ledger.pdf`}
                />
              )}
              <Button onClick={() => {
                const data = exportVendorLedgerData(selectedVendor as string);
                if (data) ExportUtils.exportToExcel(data, `${vendors.find(v => v.id === selectedVendor)?.name}_Ledger`);
              }}>
                Export Excel
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedVendor && getVendorLedger(selectedVendor).map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{entry.date.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {Array.isArray(entry.description) ? (
                        <div>
                          {entry.description.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      ) : (
                        entry.description
                      )}
                    </TableCell>
                    <TableCell className="text-right">{entry.debit > 0 ? `PKR ${entry.debit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">{entry.credit > 0 ? `PKR ${entry.credit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">PKR {entry.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {selectedVendor && getVendorLedger(selectedVendor).length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold text-right">Total Balance</TableCell>
                    <TableCell className="font-bold text-right">
                      PKR {getVendorLedger(selectedVendor)[getVendorLedger(selectedVendor).length - 1].balance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
                {selectedVendor && getVendorLedger(selectedVendor).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No transactions or payments in this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-end mt-4 text-xs text-gray-600">
              <div>Generated: {new Date().toLocaleString()}</div>
              <div className="text-right">
                <div>Software developed by Uzair Ahmed</div>
                <div>03172146698</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Purchase Summary for Vendor */}
      {selectedVendor && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Monthly Purchases & Payments Summary</h2>
            <div className="flex gap-2">
              <PdfExportButton
                document={
                  <LedgerPDF
                    data={exportVendorMonthlySummaryLedgerPDFData(selectedVendor) || []}
                    title={`${vendors.find(v => v.id === selectedVendor)?.name} - Monthly Summary`}
                    subtitle={`All Months`}
                    companyName="Company Name"
                  />
                }
                fileName={`${vendors.find(v => v.id === selectedVendor)?.name}_Monthly_Summary.pdf`}
              />
              <Button onClick={() => {
                const data = exportVendorMonthlySummaryData(selectedVendor);
                if (data) ExportUtils.exportToExcel(data, `${vendors.find(v => v.id === selectedVendor)?.name}_Monthly_Summary`);
              }}>
                Export Excel
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b">Month</th>
                  <th className="px-4 py-2 border-b">Purchases</th>
                  <th className="px-4 py-2 border-b">Payments</th>
                  <th className="px-4 py-2 border-b">Net</th>
                </tr>
              </thead>
              <tbody>
                {getVendorMonthlySummary(selectedVendor).map((row) => (
                  <tr key={row.month}>
                    <td className="px-4 py-2 border-b">{row.month}</td>
                    <td className="px-4 py-2 border-b text-blue-700 font-semibold">{row.purchases.toFixed(2)}</td>
                    <td className="px-4 py-2 border-b text-green-700 font-semibold">{row.payments.toFixed(2)}</td>
                    <td className="px-4 py-2 border-b font-bold {row.net >= 0 ? 'text-blue-700' : 'text-red-700'}">PKR {row.net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!monthlySummaryVendor} onOpenChange={(isOpen) => !isOpen && setMonthlySummaryVendor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Monthly Purchase Transactions for {vendors.find(v => v.id === monthlySummaryVendor)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <PdfExportButton
              document={
                <MonthlySummaryPDF
                  data={exportVendorMonthlyTransactionsPDF(monthlySummaryVendor) || []}
                  title={`${vendors.find(v => v.id === monthlySummaryVendor)?.name} - Monthly Purchase Summary`}
                  subtitle={`${getVendorMonthlyTransactionsWithMonthBalance(monthlySummaryVendor).map(g => g.month).join(', ')}`}
                  companyName="Company Name"
                />
              }
              fileName={`${vendors.find(v => v.id === monthlySummaryVendor)?.name}_Monthly_Purchase_Transactions.pdf`}
            />
            <Button onClick={() => {
              const data = exportVendorMonthlyTransactionsPDF(monthlySummaryVendor);
              if (data) ExportUtils.exportToExcel(data, `${vendors.find(v => v.id === monthlySummaryVendor)?.name}_Monthly_Purchase_Transactions`);
            }}>
              Export Excel
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b">Date</th>
                  <th className="px-4 py-2 border-b">Invoice No</th>
                  <th className="px-4 py-2 border-b">Description</th>
                  <th className="px-4 py-2 border-b">Amount</th>
                </tr>
              </thead>
              <tbody>
                {getVendorMonthlyTransactionsWithMonthBalance(monthlySummaryVendor).map(group => (
                  <React.Fragment key={group.month}>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={4}>Monthly Purchases for {group.month}</td>
                    </tr>
                    {group.transactions.map((t, idx) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2 border-b">{t.date ? new Date(t.date).toLocaleDateString() : ''}</td>
                        <td className="px-4 py-2 border-b">{t.invoiceNumber}</td>
                        <td className="px-4 py-2 border-b">{t.items.map(item => `${item.productName} x ${item.quantity} @ ${item.price.toFixed(2)}`).join(', ')}</td>
                        <td className="px-4 py-2 border-b text-blue-700 font-semibold">PKR {(t.type === 'purchase' ? t.totalAmount : -t.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-200">
                      <td colSpan={3} className="text-right">Total</td>
                      <td>PKR {group.monthBalance.toFixed(2)}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getVendorMonthlySummary(vendorId: string) {
  // Group purchases and payments by month for the selected vendor
  const { transactions, balancePayments } = useInventoryStore.getState();
  const summary: Record<string, { purchases: number; payments: number }> = {};
  transactions.filter(t => t.vendorId === vendorId && (t.type === 'purchase' || t.type === 'return')).forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { purchases: 0, payments: 0 };
    if (t.type === 'purchase') summary[key].purchases += t.totalAmount || 0;
    if (t.type === 'return') summary[key].purchases -= t.totalAmount || 0;
  });
  balancePayments.filter(p => p.vendorId === vendorId && p.type === 'vendor_payment').forEach(p => {
    if (!p.date) return;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { purchases: 0, payments: 0 };
    summary[key].payments += p.amount || 0;
  });
  return Object.entries(summary)
    .map(([key, val]) => ({
      month: new Date(key + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
      purchases: val.purchases,
      payments: val.payments,
      net: val.purchases - val.payments,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
}

function exportVendorMonthlySummaryData(vendorId: string) {
  return getVendorMonthlySummary(vendorId).map(row => ({
    Month: row.month,
    Purchases: `${row.purchases.toFixed(2)}`,
    Payments: `${row.payments.toFixed(2)}`,
    Net: `${row.net.toFixed(2)}`,
  }));
}

function exportVendorMonthlySummaryLedgerPDFData(vendorId: string) {
  return getVendorMonthlySummary(vendorId).map(row => ({
    Date: row.month,
    Description: 'Monthly Summary',
    Debit: row.purchases > 0 ? `PKR ${row.purchases.toFixed(2)}` : '',
    Credit: row.payments > 0 ? `PKR ${row.payments.toFixed(2)}` : '',
    Balance: `${row.net.toFixed(2)}`,
  }));
}

function getVendorMonthlyTransactionsWithMonthBalance(vendorId) {
  const { transactions } = useInventoryStore.getState();
  const summary = {};
  transactions.filter(t => t.vendorId === vendorId && (t.type === 'purchase' || t.type === 'return')).forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { transactions: [], month: key, monthBalance: 0 };
    if (t.type === 'purchase') {
      summary[key].transactions.push(t);
      summary[key].monthBalance += t.totalAmount || 0;
    } else if (t.type === 'return') {
      summary[key].transactions.push(t);
      summary[key].monthBalance -= t.totalAmount || 0;
    }
  });
  return Object.entries(summary).map(([key, val]) => {
    const v = val as { transactions: any[]; monthBalance: number };
    return {
      transactions: v.transactions,
      monthBalance: v.monthBalance,
      month: new Date(key + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
    };
  });
}

function exportVendorMonthlyTransactionsPDF(vendorId) {
  const grouped = getVendorMonthlyTransactionsWithMonthBalance(vendorId);
  const rows = grouped.flatMap(g => [
    // Transactions
    ...g.transactions.map(t => ({
      Date: t.date ? new Date(t.date).toLocaleDateString() : '',
      'Invoice No': t.invoiceNumber,
      Description: t.items.map(item => `${item.productName} x ${item.quantity} @ ${item.price.toFixed(2)}`).join(', '),
      Amount: `${(t.type === 'purchase' ? t.totalAmount : -t.totalAmount).toFixed(2)}`,
    })),
    // Total row
    {
      Date: '',
      'Invoice No': '',
      Description: 'Total Balance',
      Amount: ` ${g.monthBalance.toFixed(2)}`,
    }
  ]);
  return rows;
}