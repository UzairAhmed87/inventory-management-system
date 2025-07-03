import React, { useState, useEffect } from 'react';
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
import { apiService, LedgerEntry } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

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
    fetchBalancePayments,
    setGlobalLoader
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
  const [returnCustomerName, setReturnCustomerName] = useState<string | null>(null);

  const [monthlySummaryCustomer, setMonthlySummaryCustomer] = useState<string | null>(null);

  const [showOutstandingDialog, setShowOutstandingDialog] = useState(false);
  const [outstandingDateTo, setOutstandingDateTo] = useState('');
  const [outstandingData, setOutstandingData] = useState<any[]>([]);

  const [customerLedger, setCustomerLedger] = useState<LedgerEntry[]>([]);

  const companyName = useAuthStore((state) => state.companyName) || useAuthStore((state) => state.currentUser) || 'Company Name';

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth()).toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const [filterMode, setFilterMode] = useState<'monthYear' | 'dateRange'>('monthYear');

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
    setGlobalLoader(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer, formData);
        setEditingCustomer(null);
      } else {
        await addCustomer(formData);
      }
      setFormData({ name: '', phoneNo: '' });
      setShowForm(false);
    } catch (err: any) {
      let message = err?.message || 'Failed to save customer';
      if (
        message.toLowerCase().includes('already exists') ||
        message.toLowerCase().includes('duplicate key value violates unique constraint')
      ) {
        message = 'A customer with this phone number or name already exists.';
      }
      toast(
        message,
        {
          description: 'Error',
          className: 'bg-red-500 text-white',
        }
      );
    } finally {
      setGlobalLoader(false);
    }
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
  
  const getCustomerLedger = (customerName: string) => {
    const customerTransactions = transactions
      .filter(t => t.customer_name === customerName && (t.type === 'sale' || t.type === 'return'))
      .filter(t => {
        if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
        return true;
      });

    const customerPayments = balancePayments
      .filter(p => p.customer_name === customerName && p.type === 'customer_payment')
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

  const exportCustomerLedgerData = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (!customer) return null;

    const ledger = getCustomerLedger(customerName);

    return ledger.map(entry => ({
      Date: entry.date.toLocaleDateString(),
      Description: Array.isArray(entry.description) ? entry.description.join('\n') : entry.description,
      Debit: entry.debit > 0 ? `${entry.debit.toFixed(2)}` : '',
      Credit: entry.credit > 0 ? `${entry.credit.toFixed(2)}` : '',
      Balance: `${entry.balance.toFixed(2)}`,
    }));
  };

  const handlePayment = async (e: React.FormEvent, customer: Customer) => {
    e.preventDefault();
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0 || !paymentData.notes) return;
    const amount = parseFloat(paymentData.amount);
    if (amount > customer.balance) return;
    setGlobalLoader(true);
    try {
      // Call addBalancePayment without invoiceNumber to let inventoryStore generate it
      const newPayment = await addBalancePayment({
        type: 'customer_payment',
        customer_name: customer.name,
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
        previousBalance: newPayment.previousBalance,
        newBalance: newPayment.newBalance,
      });

      setShowSuccessDialog(true);
      setPaymentData({ amount: '', notes: '' });
      setOpenPaymentCard(null);

      toast("Payment of PKR " + amount.toFixed(2) + " recorded successfully");
    } catch (error) {
      console.error('Error recording payment:', error);
      toast("Failed to record payment. Please try again.");
    } finally {
      setGlobalLoader(false);
    }
  };
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phoneNo.includes(searchTerm)
  );

  const handleReturn = (customerName: string) => {
    setReturnCustomerName(customerName);
    setShowReturnForm(true);
  };

  const getAllOutstandingBalances = () => {
    return customers
      .filter(customer => customer.balance > 0)
      .map(customer => ({
        Name: customer.name,
        'Phone No': customer.phoneNo,
        'Outstanding Balance': customer.balance,
      }));
  };

  useEffect(() => {
    if (showOutstandingDialog) {
      setOutstandingData(getAllOutstandingBalances());
    }
    // eslint-disable-next-line
  }, [showOutstandingDialog, customers]);

  useEffect(() => {
    if (selectedCustomer) {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (customer) {
        if (filterMode === 'monthYear') {
          const year = parseInt(selectedYear);
          const month = parseInt(selectedMonth);
          const firstDay = new Date(year, month, 1).toISOString().slice(0, 10);
          const lastDay = new Date(year, month + 1, 0).toISOString().slice(0, 10);
          apiService.getCustomerLedger(customer.name, firstDay, lastDay)
            .then(setCustomerLedger)
            .catch(() => setCustomerLedger([]));
        } else {
          apiService.getCustomerLedger(customer.name, dateFrom || undefined, dateTo || undefined)
            .then(setCustomerLedger)
            .catch(() => setCustomerLedger([]));
        }
      }
    }
  }, [selectedCustomer, dateFrom, dateTo, customers, filterMode, selectedMonth, selectedYear]);

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    setFilterMode('monthYear');
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    setFilterMode('monthYear');
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    setFilterMode('dateRange');
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    setFilterMode('dateRange');
  };

  const isMonthYearSelected = () => filterMode === 'monthYear';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={() => setShowOutstandingDialog(true)}>
            Outstanding Balances
          </Button>
        </div>
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
                    Sales: {transactions.filter(t => t.customer_name === customer.name && t.type === 'sale').length}
                  </p>
                  {customer.balance > 0 && (
                    <p className="text-sm text-red-600">
                      Balance: PKR {Number(customer.balance || 0).toFixed(2)}
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
                        placeholder="Payment Description"
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
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <div>
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={month} value={idx.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFrom">From</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={handleDateFromChange} />
            </div>
            <div>
              <Label htmlFor="dateTo">To</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={handleDateToChange} />
            </div>
            <div className="flex gap-2 ml-auto">
              {selectedCustomer && (
                <PdfExportButton
                  document={
                    <LedgerPDF
                      data={customerLedger.map(entry => ({
                        Date: new Date(entry.date).toLocaleDateString(),
                        Description: entry.description,
                        Debit: entry.debit > 0 ? entry.debit.toFixed(2) : '',
                        Credit: entry.credit > 0 ? entry.credit.toFixed(2) : '',
                        Balance: entry.balance.toFixed(2),
                      }))}
                      title={`${customers.find(c => c.id === selectedCustomer)?.name} - Ledger`}
                      subtitle={isMonthYearSelected() ? `${months[parseInt(selectedMonth)]} ${selectedYear}` : (dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time')}
                      companyName={companyName}
                    />
                  }
                  fileName={`${customers.find(c => c.id === selectedCustomer)?.name}_Ledger.pdf`}
                />
              )}
              <Button onClick={() => {
                const data = customerLedger.map(entry => ({
                  Date: new Date(entry.date).toLocaleDateString(),
                  Description: entry.description,
                  Debit: entry.debit > 0 ? entry.debit.toFixed(2) : '',
                  Credit: entry.credit > 0 ? entry.credit.toFixed(2) : '',
                  Balance: entry.balance.toFixed(2),
                }));
                let label = isMonthYearSelected() ? `${months[parseInt(selectedMonth)]}_${selectedYear}` : (dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'All_Time');
                if(data) ExportUtils.exportToExcel(data, `${customers.find(c => c.id === selectedCustomer)?.name}_Ledger_${label}`, companyName);
              }}>
                Export Excel
              </Button>
            </div>
          </div>
          <div className="mt-4 max-h-96 overflow-y-auto">
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
                {selectedCustomer && customerLedger.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">{entry.debit > 0 ? `${entry.debit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">{entry.credit > 0 ? `${entry.credit.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">{entry.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {selectedCustomer && customerLedger.length > 0 && (
                  <TableRow className="font-bold border-2 border-black bg-gray-100">
                    <TableCell className="border-2 border-black"></TableCell>
                    <TableCell className="border-2 border-black">Total</TableCell>
                    <TableCell className="border-2 border-black text-right">{customerLedger.reduce((sum, e) => sum + (e.debit || 0), 0).toFixed(2)}</TableCell>
                    <TableCell className="border-2 border-black text-right">{customerLedger.reduce((sum, e) => sum + (e.credit || 0), 0).toFixed(2)}</TableCell>
                    <TableCell className="border-2 border-black text-right">{customerLedger[customerLedger.length - 1].balance.toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {selectedCustomer && customerLedger.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No transactions or payments in this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {showReturnForm && returnCustomerName && (
        <Dialog open={showReturnForm} onOpenChange={setShowReturnForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Return Products for {returnCustomerName}</DialogTitle>
            </DialogHeader>
            <TransactionForm
              type="return"
              onClose={() => setShowReturnForm(false)}
              customerId={returnCustomerName}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showOutstandingDialog} onOpenChange={setShowOutstandingDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Outstanding Customer Balances</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 mb-4">
            <div>
              <Label htmlFor="outstandingDateTo">Till Date</Label>
              <Input
                id="outstandingDateTo"
                type="date"
                value={outstandingDateTo}
                onChange={e => setOutstandingDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => ExportUtils.exportToExcel(outstandingData.map(row => ({
                  'Name': row['Name'],
                  'Phone No': row['Phone No'],
                  'Outstanding Balance': row['Outstanding Balance']
                })), 'Outstanding_Customers', companyName)}
                disabled={outstandingData.length === 0}
              >
                Export Excel
              </Button>
              <Button
                onClick={() => ExportUtils.exportOutstandingLedgerPDF(
                  outstandingData,
                  {
                    title: 'Customer Outstanding',
                    dateRange: outstandingDateTo ? `Till ${outstandingDateTo}` : 'All Time',
                    companyName: companyName,
                    fileName: 'Outstanding_Customers_Ledger'
                  }
                )}
                disabled={outstandingData.length === 0}
              >
                Export PDF
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-left">Name</th>
                  <th className="border px-2 py-1 text-left">Phone No</th>
                  <th className="border px-2 py-1 text-left">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {outstandingData.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-4">No outstanding balances found.</td></tr>
                ) : (
                  outstandingData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{row['Name']}</td>
                      <td className="border px-2 py-1">{row['Phone No']}</td>
                      <td className="border px-2 py-1 text-left"> {Number(row['Outstanding Balance']).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};