import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { ExportUtils } from '@/utils/exportUtils';
import { useInventoryStore } from '@/store/inventoryStore';
import { useAuthStore } from '@/store/authStore';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export const ExpensesSection: React.FC<{ cashInHandBeforeExpenses?: number }> = ({ cashInHandBeforeExpenses }) => {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { balancePayments, expenses, fetchExpenses, addExpense } = useInventoryStore();
  const [showGeneralLedger, setShowGeneralLedger] = useState(false);
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
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDesc = expenseDesc.trim();
    if (!expenseAmount || !trimmedDesc) {
      setExpenseError('Both fields are required');
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setExpenseError('Amount must be a positive number');
      return;
    }
    try {
      await addExpense({ amount, description: trimmedDesc, date: new Date().toISOString().slice(0, 10) });
      setExpenseAmount('');
      setExpenseDesc('');
      setExpenseError('');
      setShowExpenseModal(false);
    } catch (err) {
      setExpenseError('Failed to add expense');
    }
  };

  // Filter expenses by date range and search term
  const filteredExpenses = expenses.filter(e => {
    if (!fromDate && !toDate && !searchTerm) return true;
    const expenseDate = new Date(e.date.split(',')[0]);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from && expenseDate < from) return false;
    if (to && expenseDate > to) return false;
    if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Combine expenses and all payments (customer/vendor) into a single ledger
  const ledgerEntries = [
    ...filteredExpenses.map(e => ({
      date: e.date,
      description: e.description,
      debit: 0,
      credit: e.amount,
      type: 'expense',
    })),
    ...balancePayments
      .filter(p => {
        if (!p.date) return false;
        const paymentDate = new Date(p.date.split(',')[0]);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (from && paymentDate < from) return false;
        if (to && paymentDate > to) return false;
        return true;
      })
      .map(p => {
        if (p.type === 'vendor_payment') {
          return {
            date: p.date ? p.date.slice(0, 10) : '',
            description: `Payment${p.invoiceNumber ? ' #' + p.invoiceNumber : ''}${p.notes ? '\n' + p.notes : ''}`,
            debit: 0,
            credit: p.amount,
            type: p.type,
          };
        } else if (p.type === 'customer_payment') {
          return {
            date: p.date ? p.date.slice(0, 10) : '',
            description: `Payment${p.invoiceNumber ? ' #' + p.invoiceNumber : ''}${p.notes ? '\n' + p.notes : ''}`,
            debit: p.amount,
            credit: 0,
            type: p.type,
          };
        } else {
          return {
            date: p.date ? p.date.slice(0, 10) : '',
            description: `Payment${p.invoiceNumber ? ' #' + p.invoiceNumber : ''}${p.notes ? '\n' + p.notes : ''}`,
            debit: 0,
            credit: 0,
            type: p.type,
          };
        }
      }),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  // Use cashInHandBeforeExpenses as the initial balance, fallback to 0 if undefined
  let runningBalance = typeof cashInHandBeforeExpenses === 'number' ? cashInHandBeforeExpenses : 0;
  const previousCashInHand = runningBalance;
  const ledgerWithBalance = ledgerEntries.map(entry => {
    // For cash in hand: subtract expense and vendor payment, add customer payment
    if (entry.type === 'expense' || entry.type === 'vendor_payment') {
      runningBalance -= entry.credit;
    } else if (entry.type === 'customer_payment') {
      runningBalance += entry.debit;
    }
    return { ...entry, balance: runningBalance };
  });

  // Calculate summary values for the dialog
  const netChange = ledgerWithBalance.length > 0 ? ledgerWithBalance[ledgerWithBalance.length - 1].balance - previousCashInHand : 0;
  const currentCashInHand = ledgerWithBalance.length > 0 ? ledgerWithBalance[ledgerWithBalance.length - 1].balance : previousCashInHand;

  // Helper to check if month/year filter is active
  const isMonthYearSelected = () => filterMode === 'monthYear';

  // Export functions for unified ledger
  const handleExportLedgerExcel = () => {
    let label = isMonthYearSelected() ? `${months[parseInt(selectedMonth)]}_${selectedYear}` : (fromDate && toDate ? `${fromDate}_to_${toDate}` : 'All_Time');
    ExportUtils.exportToExcel(
      ledgerWithBalance.map(e => ({
        Date: e.date,
        Description: e.description,
        Debit: e.debit > 0 ? e.debit.toFixed(2) : '',
        Credit: e.credit > 0 ? e.credit.toFixed(2) : '',
        Balance: e.balance.toFixed(2),
      })),
      `General_Ledger_${label}`,
      companyName
    );
  };

  const handleExportLedgerPDF = () => {
    let subtitle = isMonthYearSelected() ? `${months[parseInt(selectedMonth)]} ${selectedYear}` : (fromDate && toDate ? `${fromDate} to ${toDate}` : undefined);
    ExportUtils.exportToPDF(
      ledgerWithBalance.map(e => ({
        Date: e.date,
        Description: e.description,
        Debit: e.debit > 0 ? e.debit.toFixed(2) : '',
        Credit: e.credit > 0 ? e.credit.toFixed(2) : '',
        Balance: e.balance.toFixed(2),
      })),
      'General Ledger',
      subtitle,
      {
        previousCashInHand,
        netChange,
        currentCashInHand,
      },
      companyName
    );
  };

  const totalExportedExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashInHand = typeof cashInHandBeforeExpenses === 'number' ? cashInHandBeforeExpenses : 0;

  const handleExportPDF = () => {
    const dataRows = filteredExpenses.map(e => ({
      Date: e.date ? e.date.slice(0, 10) : '',
      Description: e.description,
      Amount: e.amount.toFixed(2),
    }));
    // Add summary row (only total expenses, no cash in hand)
    dataRows.push(
      { Date: '', Description: 'Total Expenses', Amount: totalExportedExpenses.toFixed(2) }
    );
    ExportUtils.exportOutstandingLedgerPDF(
      dataRows,
      {
        title: 'Expenses History',
        dateRange: fromDate || toDate ? `${fromDate || '...'} to ${toDate || '...'}` : undefined,
        companyName,
        fileName: 'Expenses_History',
      }
    );
  };

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    setFilterMode('monthYear');
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    setFilterMode('monthYear');
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setFilterMode('dateRange');
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
    setFilterMode('dateRange');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowExpenseModal(true)} className="bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button variant="outline" onClick={() => setShowGeneralLedger(true)}>
            General Ledger
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div>
          <Label>Search</Label>
          <Input
            type="text"
            placeholder="Search description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="min-w-[250px]"
          />
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <Button onClick={handleExportLedgerExcel} className="bg-green-600 text-white">Export Excel</Button>
        <Button onClick={handleExportLedgerPDF} className="bg-red-600 text-white">Export PDF</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Date</th>
              <th className="border px-2 py-1 text-left">Description</th>
              <th className="border px-2 py-1 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-4">No expenses found.</td></tr>
            ) : (
              filteredExpenses.map((e, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">{e.date ? e.date.slice(0, 10) : ''}</td>
                  <td className="border px-2 py-1">{e.description}</td>
                  <td className="border px-2 py-1">{e.amount.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* General Ledger Dialog */}
      <Dialog open={showGeneralLedger} onOpenChange={setShowGeneralLedger}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>General Ledger (Payments & Expenses)</DialogTitle>
          </DialogHeader>
          {/* Cash in Hand Summary */}
          {/* <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="bg-gray-100 rounded p-3 flex-1">
              <div className="font-semibold text-gray-700">Previous Cash in Hand</div>
              <div className="text-lg font-bold text-blue-700">PKR {previousCashInHand.toFixed(2)}</div>
            </div>
            <div className="bg-gray-100 rounded p-3 flex-1">
              <div className="font-semibold text-gray-700">Net Change (This Period)</div>
              <div className="text-lg font-bold text-yellow-700">PKR {netChange.toFixed(2)}</div>
            </div>
            <div className="bg-gray-100 rounded p-3 flex-1">
              <div className="font-semibold text-gray-700">Current Cash in Hand</div>
              <div className="text-lg font-bold text-green-700">PKR {currentCashInHand.toFixed(2)}</div>
            </div>
          </div> */}
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
              <Label>From</Label>
              <Input type="date" value={fromDate} onChange={handleFromDateChange} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={toDate} onChange={handleToDateChange} />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button onClick={handleExportLedgerExcel} className="bg-green-600 text-white">Export Excel</Button>
              <Button onClick={handleExportLedgerPDF} className="bg-red-600 text-white">Export PDF</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-left">Date</th>
                  <th className="border px-2 py-1 text-left">Description</th>
                  <th className="border px-2 py-1 text-right">Debit</th>
                  <th className="border px-2 py-1 text-right">Credit</th>
                  <th className="border px-2 py-1 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerWithBalance.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4">No ledger entries found.</td></tr>
                ) : (
                  ledgerWithBalance.map((e, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{e.date}</td>
                      <td className="border px-2 py-1">{e.description}</td>
                      <td className="border px-2 py-1 text-right">{e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
                      <td className="border px-2 py-1 text-right">{e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
                      <td className="border px-2 py-1 text-right">{e.balance.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required />
            </div>
            <div>
              <Label>Description</Label>
              <Input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required />
            </div>
            {expenseError && <div className="text-red-500 text-sm">{expenseError}</div>}
            <Button type="submit" className="w-full bg-blue-600 text-white mt-2">Add Expense</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 