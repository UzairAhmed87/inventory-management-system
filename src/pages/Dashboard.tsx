
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, Users, Truck, TrendingUp, Download } from 'lucide-react';
import { ProductSection } from '@/components/inventory/ProductSection';
import { CustomerSection } from '@/components/inventory/CustomerSection';
import { VendorSection } from '@/components/inventory/VendorSection';
import { TransactionForm } from '@/components/inventory/TransactionForm';
import { TransactionHistory } from '@/components/inventory/TransactionHistory';
import { useInventoryStore } from '@/store/inventoryStore';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'sale' | 'purchase'>('sale');
  
  const { products, customers, vendors, transactions, initializeStore } = useInventoryStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const stats = {
    totalProducts: products.length,
    totalCustomers: customers.length,
    totalVendors: vendors.length,
    totalTransactions: transactions.length,
    lowStockProducts: products.filter(p => p.quantity <= 10).length
  };

  const handleNewTransaction = (type: 'sale' | 'purchase') => {
    setTransactionType(type);
    setShowTransactionForm(true);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'products':
        return <ProductSection />;
      case 'customers':
        return <CustomerSection />;
      case 'vendors':
        return <VendorSection />;
      case 'transactions':
        return <TransactionHistory />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs opacity-80">
                  {stats.lowStockProducts} low stock items
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-xs opacity-80">Active customers</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
                <Truck className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVendors}</div>
                <p className="text-xs opacity-80">Supplier partners</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                <p className="text-xs opacity-80">Total transactions</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management System</h1>
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleNewTransaction('sale')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
              <Button 
                onClick={() => handleNewTransaction('purchase')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Purchase
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {[
              { key: 'overview', label: 'Overview', icon: TrendingUp },
              { key: 'products', label: 'Products', icon: Package },
              { key: 'customers', label: 'Customers', icon: Users },
              { key: 'vendors', label: 'Vendors', icon: Truck },
              { key: 'transactions', label: 'Transactions', icon: Download }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {renderActiveSection()}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          type={transactionType}
          onClose={() => setShowTransactionForm(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
