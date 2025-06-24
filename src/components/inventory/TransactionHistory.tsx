import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Search, ShoppingCart, Package, Filter, Calendar } from 'lucide-react';
import { useInventoryStore, Transaction } from '@/store/inventoryStore';
import { ExportUtils } from '@/utils/exportUtils';
import { BatchTransactionForm } from './BatchTransactionForm';
import { TransactionForm } from './TransactionForm';

type TransactionFilterType = 'all' | 'sale' | 'purchase';

interface TransactionExport {
  Date: string;
  'Invoice Number': string;
  Type: 'Sale' | 'Purchase';
  'Customer/Vendor': string;
  'ID': string;
  Product: string;
  Quantity: number;
  'Unit Price': string;
  'Total Price': string;
}

export const TransactionHistory = () => {
  const { transactions, customers, vendors, fetchTransactions, fetchCustomers, fetchVendors } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TransactionFilterType>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnTransaction, setReturnTransaction] = useState<Transaction | null>(null);

  const currentYear = new Date().getFullYear();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchTransactions();
    fetchCustomers();
    fetchVendors();
  }, [fetchTransactions, fetchCustomers, fetchVendors]);

  const filteredTransactions = transactions
    .filter(t => {
      if (!t || !t.items) return false;
      
      const matchesSearch = t.items.some(item => 
        item && item.productName && item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
        (t.customerId && customers.find(c => c.id === t.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.vendorId && vendors.find(v => v.id === t.vendorId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'all' || t.type === filterType;
      
      const matchesDate = !dateFilter || new Date(t.date).toISOString().split('T')[0] === dateFilter;
      
      // Month filter
      let matchesMonth = true;
      if (monthFilter !== 'all') {
        const transactionDate = new Date(t.date);
        if (monthFilter === 'current') {
          const currentMonth = new Date().getMonth();
          matchesMonth = transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
        } else {
          const monthIndex = parseInt(monthFilter);
          matchesMonth = transactionDate.getMonth() === monthIndex && transactionDate.getFullYear() === currentYear;
        }
      }
      
      return matchesSearch && matchesType && matchesDate && matchesMonth;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportTransactions = (format: 'excel' | 'pdf') => {
    const data: TransactionExport[] = [];
    filteredTransactions.forEach(t => {
      if (!t || !t.items) return;
      
      const customer = t.customerId ? customers.find(c => c.id === t.customerId) : null;
      const vendor = t.vendorId ? vendors.find(v => v.id === t.vendorId) : null;
      
      t.items.forEach(item => {
        if (!item) return;
        data.push({
          Date: new Date(t.date).toLocaleDateString(),
          'Invoice Number': t.invoiceNumber || 'N/A',
          Type: t.type === 'sale' ? 'Sale' : 'Purchase',
          'Customer/Vendor': customer?.name || vendor?.name || 'N/A',
          'ID': customer?.uniqueId || vendor?.uniqueId || 'N/A',
          Product: item.productName || 'N/A',
          Quantity: item.quantity || 0,
          'Unit Price': ` ${(item.price || 0).toFixed(2)}`,
          'Total Price': ` ${(item.totalPrice || 0).toFixed(2)}`
        });
      });
    });

    if (format === 'excel') {
      ExportUtils.exportToExcel(data, 'Transaction_History');
    } else {
      ExportUtils.exportToPDF(data, 'Transaction History');
    }
  };

  const getTotalValue = (type?: 'sale' | 'purchase') => {
    if (type === 'sale') {
      return filteredTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0)
        - filteredTransactions
        .filter(t => t.type === 'return')
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    }
    return filteredTransactions
      .filter(t => !type || t.type === type)
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  };

  const handleDownloadBill = (transaction: Transaction) => {
    const customer = transaction.customerId ? customers.find(c => c.id === transaction.customerId) : null;
    const vendor = transaction.vendorId ? vendors.find(v => v.id === transaction.vendorId) : null;
    
    ExportUtils.exportTransactionBill(transaction, customer, vendor, 'pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Transaction History</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Sales</p>
                <p className="text-3xl font-bold text-green-800">
                  PKR {getTotalValue('sale').toFixed(2)}
                </p>
              </div>
              <ShoppingCart className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Purchases</p>
                <p className="text-3xl font-bold text-blue-800">
                  PKR {getTotalValue('purchase').toFixed(2)}
                </p>
              </div>
              <Package className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-800">
                  {filteredTransactions.length}
                </p>
              </div>
              <Filter className="h-10 w-10 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Type</label>
              <Select value={filterType} onValueChange={(value: TransactionFilterType) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="sale">Sales Only</SelectItem>
                  <SelectItem value="purchase">Purchases Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Month</label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="current">Current Month</SelectItem>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month} {currentYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Specific Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="text-left p-4 font-semibold text-gray-700">Invoice</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Customer/Vendor</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Items</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Total</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  if (!transaction) return null;
                  
                  const customer = transaction.customerId ? customers.find(c => c.id === transaction.customerId) : null;
                  const vendor = transaction.vendorId ? vendors.find(v => v.id === transaction.vendorId) : null;
                  
                  return (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {transaction.invoiceNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'sale' 
                            ? 'bg-green-100 text-green-700' 
                            : transaction.type === 'purchase'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {transaction.type === 'sale' ? 'Sale' : transaction.type === 'purchase' ? 'Purchase' : 'Return'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{customer?.name || vendor?.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{customer?.uniqueId || vendor?.uniqueId || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {transaction.items && Array.isArray(transaction.items) ? 
                            transaction.items.map((item, index) => (
                              <div key={index} className="text-sm">
                                {item.productName} x {item.quantity || 0} @ PKR {(item.price || 0).toFixed(2)}
                              </div>
                            )) : <span className="text-gray-500">No items</span>
                          }
                        </div>
                      </td>
                      <td className="p-4 font-bold text-lg">PKR {(transaction.totalAmount || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadBill(transaction)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        >
                          <FileDown className="h-3 w-3 mr-1" />
                          Bill
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setShowEditForm(true);
                          }}
                          className="ml-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                        >
                          Edit
                        </Button>
                        {(transaction.type === 'sale' || transaction.type === 'purchase') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReturnTransaction(transaction);
                              setShowReturnForm(true);
                            }}
                            className="ml-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          >
                            Return
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No transactions found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showEditForm && editingTransaction && (
        <BatchTransactionForm
          type={editingTransaction.type === 'return' ? 'sale' : editingTransaction.type}
          onClose={() => {
            setShowEditForm(false);
            setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          isEditMode={true}
        />
      )}
      {showReturnForm && returnTransaction && (
        <TransactionForm
          type="return"
          onClose={() => {
            setShowReturnForm(false);
            setReturnTransaction(null);
          }}
          customerId={returnTransaction.customerId}
          originalTransaction={returnTransaction}
        />
      )}
    </div>
  );
};
