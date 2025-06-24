import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, Truck, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';

export const OverviewDashboard = () => {
  const { products, customers, vendors, transactions, fetchProducts, fetchCustomers, fetchVendors, fetchTransactions } = useInventoryStore();

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchVendors();
    fetchTransactions();
  }, [fetchProducts, fetchCustomers, fetchVendors, fetchTransactions]);

  // Calculate current month transactions
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  });

  // Calculate previous month for comparison
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const previousMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === previousMonth && transactionDate.getFullYear() === previousYear;
  });

  // Calculate insights
  const stats = {
    totalProducts: products.length,
    totalCustomers: customers.length,
    totalVendors: vendors.length,
    lowStockProducts: products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
    outOfStockProducts: products.filter(p => p.quantity === 0).length,
    
    // Current month sales (subtract returns)
    currentMonthSales: currentMonthTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.totalAmount || 0), 0)
      - currentMonthTransactions.filter(t => t.type === 'return').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    currentMonthPurchases: currentMonthTransactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    currentMonthTransactions: currentMonthTransactions.length,
    
    // Previous month for comparison
    previousMonthSales: previousMonthTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.totalAmount || 0), 0)
      - previousMonthTransactions.filter(t => t.type === 'return').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    previousMonthPurchases: previousMonthTransactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    
    // All time stats
    totalSales: transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.totalAmount || 0), 0)
      - transactions.filter(t => t.type === 'return').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    totalPurchases: transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    totalTransactions: transactions.length,

    // Balance stats
    totalCustomerBalance: customers.reduce((sum, c) => sum + (c.balance || 0), 0),
    totalVendorBalance: vendors.reduce((sum, v) => sum + (v.balance || 0), 0),
  };

  // Calculate growth percentages
  const salesGrowth = stats.previousMonthSales > 0 
    ? ((stats.currentMonthSales - stats.previousMonthSales) / stats.previousMonthSales) * 100 
    : 0;
  
  const purchaseGrowth = stats.previousMonthPurchases > 0 
    ? ((stats.currentMonthPurchases - stats.previousMonthPurchases) / stats.previousMonthPurchases) * 100 
    : 0;

  // Get top selling products this month
  const productSales = currentMonthTransactions
    .filter(t => t.type === 'sale')
    .reduce((acc, t) => {
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach(item => {
          if (item && item.productName) {
            acc[item.productName] = (acc[item.productName] || 0) + (item.quantity || 0);
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

  const topSellingProducts = Object.entries(productSales)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Get recent transactions
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-100 text-blue-900 border border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs opacity-80">
              {stats.lowStockProducts} low stock • {stats.outOfStockProducts} out of stock
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-100 text-green-900 border border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {stats.currentMonthSales.toFixed(2)}</div>
            <p className="text-xs opacity-80 flex items-center">
              {salesGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(salesGrowth).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-100 text-purple-900 border border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Purchases</CardTitle>
            <Truck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {stats.currentMonthPurchases.toFixed(2)}</div>
            <p className="text-xs opacity-80 flex items-center">
              {purchaseGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(purchaseGrowth).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-100 text-orange-900 border border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
            <BarChart3 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {(stats.currentMonthSales - stats.currentMonthPurchases).toFixed(2)}
            </div>
            <p className="text-xs opacity-80">
              Gross income this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-red-100 text-red-900 border border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Outstanding</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {stats.totalCustomerBalance.toFixed(2)}</div>
            <p className="text-xs opacity-80">
              Amount customers owe us
            </p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-100 text-yellow-900 border border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendor Outstanding</CardTitle>
            <Truck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {stats.totalVendorBalance.toFixed(2)}</div>
            <p className="text-xs opacity-80">
              Amount we owe vendors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Customer & Vendor Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Customers:</span>
              <span className="font-bold">{stats.totalCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Vendors:</span>
              <span className="font-bold">{stats.totalVendors}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly Transactions:</span>
              <span className="font-bold">{stats.currentMonthTransactions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Low Stock Items:</span>
              <span className="font-bold text-orange-600">{stats.lowStockProducts}</span>
            </div>
            <div className="flex justify-between">
              <span>Out of Stock:</span>
              <span className="font-bold text-red-600">{stats.outOfStockProducts}</span>
            </div>
            <div className="flex justify-between">
              <span>Well Stocked:</span>
              <span className="font-bold text-green-600">
                {stats.totalProducts - stats.lowStockProducts - stats.outOfStockProducts}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              All Time Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Sales:</span>
              <span className="font-bold text-green-600">PKR {stats.totalSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Purchases:</span>
              <span className="font-bold text-blue-600">PKR {stats.totalPurchases.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>All Transactions:</span>
              <span className="font-bold">{stats.totalTransactions}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Sales & Purchases Summary */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Previous Month Sales & Purchases Summary</h2>
          {/* Export buttons will be added here */}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">Month</th>
                <th className="px-4 py-2 border-b">Sales</th>
                <th className="px-4 py-2 border-b">Purchases</th>
                <th className="px-4 py-2 border-b">Net</th>
              </tr>
            </thead>
            <tbody>
              {getPreviousMonthSummary(transactions).map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-2 border-b">{row.month}</td>
                  <td className="px-4 py-2 border-b text-green-700 font-semibold">PKR {row.sales.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b text-blue-700 font-semibold">PKR {row.purchases.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b font-bold {row.net >= 0 ? 'text-green-700' : 'text-red-700'}">PKR {row.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Selling Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {topSellingProducts.length > 0 ? (
              <div className="space-y-3">
                {topSellingProducts.map(([product, quantity], index) => (
                  <div key={product} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </span>
                      <span>{product}</span>
                    </div>
                    <span className="font-bold">{quantity} units</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No sales this month</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">
                        {(transaction.items && Array.isArray(transaction.items) ? transaction.items.length : 0)} item{(transaction.items && Array.isArray(transaction.items) && transaction.items.length > 1) ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()} • 
                        <span className={`ml-1 ${transaction.type === 'sale' ? 'text-green-600' : transaction.type === 'return' ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {transaction.type === 'sale' ? 'Sale' : transaction.type === 'return' ? 'Return' : 'Purchase'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">PKR {(transaction.totalAmount || 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.items && Array.isArray(transaction.items) 
                          ? transaction.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                          : 0
                        } units
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent transactions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function getMonthlySummary(transactions: any[]) {
  // Group transactions by month and year
  const summary: Record<string, { sales: number; purchases: number }> = {};
  transactions.forEach((t) => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!summary[key]) summary[key] = { sales: 0, purchases: 0 };
    if (t.type === 'sale') summary[key].sales += t.totalAmount || 0;
    if (t.type === 'return') summary[key].sales -= t.totalAmount || 0;
    if (t.type === 'purchase') summary[key].purchases += t.totalAmount || 0;
  });
  // Convert to array and sort by date descending
  return Object.entries(summary)
    .map(([key, val]) => ({
      month: new Date(key + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }),
      sales: val.sales,
      purchases: val.purchases,
      net: val.sales - val.purchases,
    }))
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
}

function getPreviousMonthSummary(transactions: any[]) {
  const now = new Date();
  const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const summary = { sales: 0, purchases: 0 };
  transactions.forEach((t) => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (d.getMonth() === previousMonth && d.getFullYear() === previousYear) {
      if (t.type === 'sale') summary.sales += t.totalAmount || 0;
      if (t.type === 'return') summary.sales -= t.totalAmount || 0;
      if (t.type === 'purchase') summary.purchases += t.totalAmount || 0;
    }
  });
  const monthLabel = new Date(previousYear, previousMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  return [{
    month: monthLabel,
    sales: summary.sales,
    purchases: summary.purchases,
    net: summary.sales - summary.purchases,
  }];
}
