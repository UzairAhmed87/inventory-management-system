
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Search, ShoppingCart, Package, Filter } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { ExportUtils } from '@/utils/exportUtils';

export const TransactionHistory = () => {
  const { transactions, customers, vendors, products } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'purchase'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customerId && customers.find(c => c.id === t.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.vendorId && vendors.find(v => v.id === t.vendorId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'all' || t.type === filterType;
      
      const matchesDate = !dateFilter || new Date(t.date).toISOString().split('T')[0] === dateFilter;
      
      return matchesSearch && matchesType && matchesDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportTransactions = (format: 'excel' | 'pdf') => {
    const data = filteredTransactions.map(t => {
      const customer = t.customerId ? customers.find(c => c.id === t.customerId) : null;
      const vendor = t.vendorId ? vendors.find(v => v.id === t.vendorId) : null;
      
      return {
        Date: new Date(t.date).toLocaleDateString(),
        Type: t.type === 'sale' ? 'Sale' : 'Purchase',
        'Customer/Vendor': customer?.name || vendor?.name || 'N/A',
        Product: t.productName,
        Quantity: t.quantity,
        'Unit Price': `$${t.price.toFixed(2)}`,
        'Total Price': `$${t.totalPrice.toFixed(2)}`
      };
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
      .reduce((sum, t) => sum + t.totalPrice, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => exportTransactions('excel')}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportTransactions('pdf')}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-700">
                  ${getTotalValue('sale').toFixed(2)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Purchases</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${getTotalValue('purchase').toFixed(2)}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-700">
                  {filteredTransactions.length}
                </p>
              </div>
              <Filter className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="text-sm font-medium mb-2 block">Date</label>
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
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Customer/Vendor</th>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Qty</th>
                  <th className="text-left p-3">Unit Price</th>
                  <th className="text-left p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const customer = transaction.customerId ? customers.find(c => c.id === transaction.customerId) : null;
                  const vendor = transaction.vendorId ? vendors.find(v => v.id === transaction.vendorId) : null;
                  
                  return (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.type === 'sale' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {transaction.type === 'sale' ? 'Sale' : 'Purchase'}
                        </span>
                      </td>
                      <td className="p-3">{customer?.name || vendor?.name || 'N/A'}</td>
                      <td className="p-3">{transaction.productName}</td>
                      <td className="p-3">{transaction.quantity}</td>
                      <td className="p-3">${transaction.price.toFixed(2)}</td>
                      <td className="p-3 font-semibold">${transaction.totalPrice.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
