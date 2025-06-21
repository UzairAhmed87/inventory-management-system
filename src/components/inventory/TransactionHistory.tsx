
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Search, ShoppingCart, Package, Filter, Calendar } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { ExportUtils } from '@/utils/exportUtils';

export const TransactionHistory = () => {
  const { transactions, customers, vendors } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'purchase'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');

  const currentYear = new Date().getFullYear();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.items.some(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase())
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
    const data: any[] = [];
    filteredTransactions.forEach(t => {
      const customer = t.customerId ? customers.find(c => c.id === t.customerId) : null;
      const vendor = t.vendorId ? vendors.find(v => v.id === t.vendorId) : null;
      
      t.items.forEach(item => {
        data.push({
          Date: new Date(t.date).toLocaleDateString(),
          Type: t.type === 'sale' ? 'Sale' : 'Purchase',
          'Customer/Vendor': customer?.name || vendor?.name || 'N/A',
          Product: item.productName,
          Quantity: item.quantity || 0,
          'Unit Price': `PKR ${(item.price || 0).toFixed(2)}`,
          'Total Price': `PKR ${(item.totalPrice || 0).toFixed(2)}`
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
    return filteredTransactions
      .filter(t => !type || t.type === type)
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  };

  const exportTransactionBill = (transaction: any, format: 'excel' | 'pdf') => {
    const customer = transaction.customerId ? customers.find(c => c.id === transaction.customerId) : null;
    const vendor = transaction.vendorId ? vendors.find(v => v.id === transaction.vendorId) : null;
    
    const data = transaction.items.map((item: any) => ({
      Product: item.productName,
      Quantity: item.quantity || 0,
      'Unit Price': `PKR ${(item.price || 0).toFixed(2)}`,
      'Total Price': `PKR ${(item.totalPrice || 0).toFixed(2)}`
    }));

    // Add total row
    data.push({
      Product: 'TOTAL',
      Quantity: '',
      'Unit Price': '',
      'Total Price': `PKR ${(transaction.totalAmount || 0).toFixed(2)}`
    });

    const title = `${transaction.type === 'sale' ? 'Sale' : 'Purchase'} Bill - ${customer?.name || vendor?.name || 'N/A'} - ${new Date(transaction.date).toLocaleDateString()}`;

    if (format === 'excel') {
      ExportUtils.exportToExcel(data, `${transaction.type}_bill_${Date.now()}`);
    } else {
      ExportUtils.exportToPDF(data, title);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => exportTransactions('excel')}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportTransactions('pdf')}
            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Sales</p>
                <p className="text-3xl font-bold text-green-700">
                  PKR {getTotalValue('sale').toFixed(2)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Purchases</p>
                <p className="text-3xl font-bold text-blue-700">
                  PKR {getTotalValue('purchase').toFixed(2)}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-700">
                  {filteredTransactions.length}
                </p>
              </div>
              <Filter className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
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
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
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
              <label className="text-sm font-medium mb-2 block">Month</label>
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
              <label className="text-sm font-medium mb-2 block">Specific Date</label>
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
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Customer/Vendor</th>
                  <th className="text-left p-4 font-semibold">Items</th>
                  <th className="text-left p-4 font-semibold">Total</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const customer = transaction.customerId ? customers.find(c => c.id === transaction.customerId) : null;
                  const vendor = transaction.vendorId ? vendors.find(v => v.id === transaction.vendorId) : null;
                  
                  return (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'sale' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {transaction.type === 'sale' ? 'Sale' : 'Purchase'}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{customer?.name || vendor?.name || 'N/A'}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {transaction.items.map((item, index) => (
                            <div key={index} className="text-sm">
                              {item.productName} x {item.quantity || 0} @ PKR {(item.price || 0).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-lg">PKR {(transaction.totalAmount || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportTransactionBill(transaction, 'excel')}
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            <FileDown className="h-3 w-3 mr-1" />
                            Excel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportTransactionBill(transaction, 'pdf')}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          >
                            <FileDown className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                        </div>
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
    </div>
  );
};
