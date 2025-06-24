import React, { useState, useEffect, ComponentType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, User, FileDown, Search } from 'lucide-react';
import { useInventoryStore, Customer } from '@/store/inventoryStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExportUtils } from '@/utils/exportUtils';
import { PaymentSuccessDialog } from './PaymentSuccessDialog';
import { CompletedPayment } from '@/types';
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
import { TransactionForm } from './TransactionForm';
import { toast } from 'sonner';
import { MonthlySummaryPDF } from './MonthlySummaryPDF';

export const CustomerSection = () => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    transactions, 
    fetchCustomers, 
    fetchTransactions,
    addBalancePayment,
    balancePayments,
    fetchBalancePayments
  } = useInventoryStore();

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', phoneNo: '' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [openPaymentCard, setOpenPaymentCard] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({ amount: '', notes: '' });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnCustomerId, setReturnCustomerId] = useState<string | null>(null);

  const [monthlySummaryCustomer, setMonthlySummaryCustomer] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchTransactions();
    fetchBalancePayments();
  }, [fetchCustomers, fetchTransactions, fetchBalancePayments]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phoneNo) return;

    if (editingCustomer) {
      await updateCustomer(editingCustomer, formData);
      setEditingCustomer(null);
    } else {
      await addCustomer(formData);
    }
    setFormData({ name: '', phoneNo: '' });
    setShowForm(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer.id);
    setFormData({ name: customer.name, phoneNo: customer.phoneNo });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
    }
  };

  const resetFormData = () => {
    setFormData({ name: '', phoneNo: '' });
    setEditingCustomer(null);
    setShowForm(false);
  };
  
  const getCustomerLedger = (customerId: string) => {
    const customerTransactions = transactions
      .filter(t => t.customerId === customerId && (t.type === 'sale' || t.type === 'return'))
      .filter(t => {
        if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
        return true;
      });

    const customerPayments = balancePayments
      .filter(p => p.customerId === customerId && p.type === 'customer_payment')
      .filter(p => {
        if (dateFrom && new Date(p.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(p.date) > new Date(dateTo)) return false;
        return true;
      });

    const ledgerEntries = [
      ...customerTransactions.map(t => {
        let desc = t.items.length > 1
          ? t.items.map(item => `${item.productName} x ${item.quantity} @ ${item.price.toFixed(2)}`)
          : `${t.items[0].productName} x ${t.items[0].quantity} @ ${t.items[0].price.toFixed(2)}`;
        if (t.type === 'sale') {
          desc = Array.isArray(desc) ? desc : [desc];
          desc.unshift(`Sale Invoice: ${t.invoiceNumber}`);
        } else if (t.type === 'return') {
          desc = Array.isArray(desc) ? desc : [desc];
          desc.unshift(`Return Invoice: ${t.invoiceNumber}`);
        }
        return {
          date: new Date(t.date),
          description: desc,
          debit: t.type === 'sale' ? t.totalAmount : 0,
          credit: t.type === 'return' ? t.totalAmount : 0,
        };
      }),
      ...customerPayments.map(p => ({
        date: new Date(p.date),
        description: [`Payment Invoice: ${p.invoiceNumber}`,`Payment${p.notes ? `: ${p.notes}` : ''}`],
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

  const exportCustomerLedgerData = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;

    const ledger = getCustomerLedger(customerId);

    return ledger.map(entry => ({
      Date: entry.date.toLocaleDateString(),
      Description: Array.isArray(entry.description) ? entry.description.join('\n') : entry.description,
      Debit: entry.debit > 0 ? `PKR ${entry.debit.toFixed(2)}` : '',
      Credit: entry.credit > 0 ? `PKR ${entry.credit.toFixed(2)}` : '',
      Balance: `PKR ${entry.balance.toFixed(2)}`,
    }));
  };

  const handlePayment = async (e: React.FormEvent, customer: Customer) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0 || !paymentData.notes) return;
    const amount = parseFloat(paymentData.amount);
    if (amount > customer.balance) return;

    try {
      // Call addBalancePayment without invoiceNumber to let inventoryStore generate it
      const newPayment = await addBalancePayment({
        type: 'customer_payment',
        customerId: customer.id,
        amount,
        notes: paymentData.notes,
        date: new Date().toISOString(), // Set date here
      });

      console.log('New Payment:', newPayment); // Debug log

      // Set completedPayment with the generated invoiceNumber
      setCompletedPayment({
        type: 'customer',
        entity: customer,
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
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phoneNo.includes(searchTerm)
  );

  const handleReturn = (customerId: string) => {
    setReturnCustomerId(customerId);
    setShowReturnForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter customer name"
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
                <Button type="button" variant="outline" onClick={resetFormData}>Cancel</Button>
                <Button type="submit">{editingCustomer ? 'Update' : 'Add'} Customer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Customers
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
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">{customer.name}</CardTitle>
              </div>
              <div className="flex space-x-1 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedCustomer(customer.id);
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Ledger
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMonthlySummaryCustomer(customer.id)}
                >
                  Monthly Summary
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(customer.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="text-sm text-gray-600">Phone: {customer.phoneNo}</p>
                  <p className="text-sm text-gray-600">
                    Sales: {transactions.filter(t => t.customerId === customer.id && t.type === 'sale').length}
                  </p>
                  {customer.balance > 0 && (
                    <p className="text-sm text-red-600">
                      Balance: PKR {customer.balance.toFixed(2)}
                    </p>
                  )}
                </div>
                {customer.balance > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenPaymentCard(openPaymentCard === customer.id ? null : customer.id)}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
              {openPaymentCard === customer.id && (
                <form onSubmit={(e) => handlePayment(e, customer)} className="space-y-3 mt-3 bg-gray-50 p-3 rounded border">
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="paymentAmount">Amount (PKR)</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                        max={customer.balance}
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

      {filteredCustomers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {customers.length === 0 
                ? "No customers found. Add your first customer to get started."
                : "No customers match your search criteria."
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
      
      <Dialog open={!!selectedCustomer} onOpenChange={(isOpen) => !isOpen && setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ledger for {customers.find((c) => c.id === selectedCustomer)?.name}</DialogTitle>
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
              {selectedCustomer && (
                <PdfExportButton
                  document={
                    <LedgerPDF 
                      data={exportCustomerLedgerData(selectedCustomer) || []}
                      title={`${customers.find(c => c.id === selectedCustomer)?.name} - Ledger`}
                      subtitle={`Date Range: ${(dateFrom && dateTo) ? `${dateFrom} to ${dateTo}` : 'All Time'}`}
                      companyName="Company Name"
                    />
                  }
                  fileName={`${customers.find(c => c.id === selectedCustomer)?.name}_Ledger.pdf`}
                />
              )}
              <Button onClick={() => {
                const data = exportCustomerLedgerData(selectedCustomer as string);
                if(data) ExportUtils.exportToExcel(data, `${customers.find(c => c.id === selectedCustomer)?.name}_Ledger`);
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
                {selectedCustomer && getCustomerLedger(selectedCustomer).map((entry, index) => (
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
                {selectedCustomer && getCustomerLedger(selectedCustomer).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No transactions or payments in this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Sales Summary for Customer */}
      {selectedCustomer && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Monthly Sales & Payments Summary</h2>
            <div className="flex gap-2">
              <PdfExportButton
                document={
                  <LedgerPDF
                    data={exportCustomerMonthlySummaryLedgerPDFData(selectedCustomer) || []}
                    title={`${customers.find(c => c.id === selectedCustomer)?.name} - Monthly Summary`}
                    subtitle={`All Months`}
                    companyName="Company Name"
                  />
                }
                fileName={`${customers.find(c => c.id === selectedCustomer)?.name}_Monthly_Summary.pdf`}
              />
              <Button onClick={() => {
                const data = exportCustomerMonthlySummaryData(selectedCustomer);
                if (data) ExportUtils.exportToExcel(data, `${customers.find(c => c.id === selectedCustomer)?.name}_Monthly_Summary`);
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
                  <th className="px-4 py-2 border-b">Sales</th>
                  <th className="px-4 py-2 border-b">Payments</th>
                  <th className="px-4 py-2 border-b">Net</th>
                </tr>
              </thead>
              <tbody>
                {getCustomerMonthlySummary(selectedCustomer).map((row) => (
                  <tr key={row.month}>
                    <td className="px-4 py-2 border-b">{row.month}</td>
                    <td className="px-4 py-2 border-b text-green-700 font-semibold">PKR {row.sales.toFixed(2)}</td>
                    <td className="px-4 py-2 border-b text-blue-700 font-semibold">PKR {row.payments.toFixed(2)}</td>
                    <td className="px-4 py-2 border-b font-bold {row.net >= 0 ? 'text-green-700' : 'text-red-700'}">PKR {row.net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showReturnForm && returnCustomerId && (
        <Dialog open={showReturnForm} onOpenChange={setShowReturnForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Return Products for {customers.find(c => c.id === returnCustomerId)?.name}</DialogTitle>
            </DialogHeader>
            <TransactionForm
              type="return"
              onClose={() => setShowReturnForm(false)}
              customerId={returnCustomerId}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!monthlySummaryCustomer} onOpenChange={(isOpen) => !isOpen && setMonthlySummaryCustomer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Monthly Sales Transactions for {customers.find(c => c.id === monthlySummaryCustomer)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <PdfExportButton
              document={
                <MonthlySummaryPDF
                  data={exportCustomerMonthlyTransactionsPDF(monthlySummaryCustomer) || []}
                  title={`${customers.find(c => c.id === monthlySummaryCustomer)?.name} - Monthly Sales Summary`}
                  subtitle={`${getCustomerMonthlyTransactionsWithMonthBalance(monthlySummaryCustomer).map(g => g.month).join(', ')}`}
                  companyName="Company Name"
                />
              }
              fileName={`${customers.find(c => c.id === monthlySummaryCustomer)?.name}_Monthly_Sales_Transactions.pdf`}
            />
            <Button onClick={() => {
              const data = exportCustomerMonthlyTransactionsPDF(monthlySummaryCustomer);
              if (data) ExportUtils.exportToExcel(data, `${customers.find(c => c.id === monthlySummaryCustomer)?.name}_Monthly_Sales_Transactions`);
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
                {getCustomerMonthlyTransactionsWithMonthBalance(monthlySummaryCustomer).map(group => (
                  <React.Fragment key={group.month}>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={4}
                        >Monthly Sales for {group.month}</td>
                    </tr>
                    {group.transactions.map((t, idx) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2 border-b">{t.date ? new Date(t.date).toLocaleDateString() : ''}</td>
                        <td className="px-4 py-2 border-b">{t.invoiceNumber}</td>
                        <td className="px-4 py-2 border-b">{t.items.map(item => `${item.productName} x ${item.quantity} @ ${item.price.toFixed(2)}`).join(', ')}</td>
                        <td className="px-4 py-2 border-b text-green-700 font-semibold">{(t.type === 'sale' ? t.totalAmount : -t.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-gray-200">
                      <td colSpan={3} className="text-right">Total Balance:</td>
                      <td>{group.monthBalance.toFixed(2)}</td>
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

function getCustomerMonthlySummary(customerId: string) {
  // Group sales and payments by month for the selected customer
  const { transactions, balancePayments } = useInventoryStore.getState();
  const summary: Record<string, { sales: number; payments: number }> = {};
  transactions.filter(t => t.customerId === customerId && (t.type === 'sale' || t.type === 'return')).forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { sales: 0, payments: 0 };
    if (t.type === 'sale') summary[key].sales += t.totalAmount || 0;
    if (t.type === 'return') summary[key].sales -= t.totalAmount || 0;
  });
  balancePayments.filter(p => p.customerId === customerId && p.type === 'customer_payment').forEach(p => {
    if (!p.date) return;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { sales: 0, payments: 0 };
    summary[key].payments += p.amount || 0;
  });
  return Object.entries(summary)
    .map(([key, val]) => ({
      month: new Date(key + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
      sales: val.sales,
      payments: val.payments,
      net: val.sales - val.payments,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
}

function exportCustomerMonthlySummaryData(customerId: string) {
  return getCustomerMonthlySummary(customerId).map(row => ({
    Month: row.month,
    Sales: `${row.sales.toFixed(2)}`,
    Payments: `${row.payments.toFixed(2)}`,
    Net: `${row.net.toFixed(2)}`,
  }));
}

function exportCustomerMonthlySummaryLedgerPDFData(customerId: string) {
  return getCustomerMonthlySummary(customerId).map(row => ({
    Date: row.month,
    Description: 'Monthly Summary',
    Debit: row.sales > 0 ? `PKR ${row.sales.toFixed(2)}` : '',
    Credit: row.payments > 0 ? `PKR ${row.payments.toFixed(2)}` : '',
    Balance: ` ${row.net.toFixed(2)}`,
  }));
}

function getCustomerMonthlyTransactionsWithMonthBalance(customerId) {
  const { transactions } = useInventoryStore.getState();
  const summary = {};
  transactions.filter(t => t.customerId === customerId && (t.type === 'sale' || t.type === 'return')).forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { transactions: [], month: key, monthBalance: 0 };
    if (t.type === 'sale') {
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

function exportCustomerMonthlyTransactionsPDF(customerId) {
  const grouped = getCustomerMonthlyTransactionsWithMonthBalance(customerId);
  const rows = grouped.flatMap(g => [
    // Month header row
    
    // Transactions
    ...g.transactions.map(t => ({
      Date: t.date ? new Date(t.date).toLocaleDateString() : '',
      'Invoice No': t.invoiceNumber,
      Description: t.items.map(item => `${item.productName} x ${item.quantity} @ ${item.price.toFixed(2)}`).join(', '),
      Amount: `${(t.type === 'sale' ? t.totalAmount : -t.totalAmount).toFixed(2)}`,
    })),
    // Total row
    {
      Date: '',
      'Invoice No': '',
      Description: 'Total Balance',
      Amount: `${g.monthBalance.toFixed(2)}`,
    }
  ]);
  return rows;
}