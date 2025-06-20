
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, Truck, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';

export const OverviewDashboard = () => {
  const { products, customers, vendors, transactions } = useInventoryStore();

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
    lowStockProducts: products.filter(p => p.quantity <= 10).length,
    outOfStockProducts: products.filter(p => p.quantity === 0).length,
    
    // Current month sales
    currentMonthSales: currentMonthTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalPrice, 0),
    currentMonthPurchases: currentMonthTransactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.totalPrice, 0),
    currentMonthTransactions: currentMonthTransactions.length,
    
    // Previous month for comparison
    previousMonthSales: previousMonthTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalPrice, 0),
    previousMonthPurchases: previousMonthTransactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.totalPrice, 0),
    
    // All time stats
    totalSales: transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalPrice, 0),
    totalPurchases: transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.totalPrice, 0),
    totalTransactions: transactions.length,
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
      acc[t.productName] = (acc[t.productName] || 0) + t.quantity;
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
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
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

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.currentMonthSales.toFixed(2)}</div>
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

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Purchases</CardTitle>
            <Truck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.currentMonthPurchases.toFixed(2)}</div>
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

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
            <BarChart3 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.currentMonthSales - stats.currentMonthPurchases).toFixed(2)}
            </div>
            <p className="text-xs opacity-80">
              Gross profit this month
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
              <span className="font-bold text-green-600">${stats.totalSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Purchases:</span>
              <span className="font-bold text-blue-600">${stats.totalPurchases.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>All Transactions:</span>
              <span className="font-bold">{stats.totalTransactions}</span>
            </div>
          </CardContent>
        </Card>
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
                      <p className="font-medium">{transaction.productName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()} • 
                        <span className={`ml-1 ${transaction.type === 'sale' ? 'text-green-600' : 'text-blue-600'}`}>
                          {transaction.type === 'sale' ? 'Sale' : 'Purchase'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${transaction.totalPrice.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{transaction.quantity} units</p>
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
