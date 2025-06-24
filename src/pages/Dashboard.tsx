import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, Users, Truck, TrendingUp, Download, LogOut, User } from 'lucide-react';
import { ProductSection } from '@/components/inventory/ProductSection';
import { CustomerSection } from '@/components/inventory/CustomerSection';
import { VendorSection } from '@/components/inventory/VendorSection';
import { BatchTransactionForm } from '@/components/inventory/BatchTransactionForm';
import { TransactionHistory } from '@/components/inventory/TransactionHistory';
import { OverviewDashboard } from '@/components/inventory/OverviewDashboard';
import { BalanceManager } from '@/components/inventory/BalanceManager';
import { useInventoryStore } from '@/store/inventoryStore';
import { useAuthStore } from '@/store/authStore';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'sale' | 'purchase'>('sale');
  
  const { fetchProducts, fetchCustomers, fetchVendors, fetchTransactions, fetchBalancePayments } = useInventoryStore();
  const { currentUser, logout } = useAuthStore();

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchVendors();
    fetchTransactions();
    fetchBalancePayments();
  }, [fetchProducts, fetchCustomers, fetchVendors, fetchTransactions, fetchBalancePayments]);

  const handleNewTransaction = (type: 'sale' | 'purchase') => {
    setTransactionType(type);
    setShowTransactionForm(true);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'products':
        return <ProductSection />;
      case 'customers':
        return (
          <div className="space-y-8">
            <CustomerSection />
            <BalanceManager type="customer" />
          </div>
        );
      case 'vendors':
        return (
          <div className="space-y-8">
            <VendorSection />
            <BalanceManager type="vendor" />
          </div>
        );
      case 'transactions':
        return <TransactionHistory />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-xl border-b border-gray-200 backdrop-blur-sm">
        <div className="max-w-7xl my-3 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trackistory</h1>
                <p className="text-sm text-gray-600">Professional Business Solution</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex space-x-3">
                <Button 
                  onClick={() => handleNewTransaction('sale')}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Sale
                </Button>
                <Button 
                  onClick={() => handleNewTransaction('purchase')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Purchase
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{currentUser}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-2 bg-white rounded-2xl p-3 shadow-xl border border-gray-200 backdrop-blur-sm">
            {[
              { key: 'overview', label: 'Overview', icon: TrendingUp, color: 'text-purple-600' },
              { key: 'products', label: 'Products', icon: Package, color: 'text-green-600' },
              { key: 'customers', label: 'Customers', icon: Users, color: 'text-blue-600' },
              { key: 'vendors', label: 'Vendors', icon: Truck, color: 'text-orange-600' },
              { key: 'transactions', label: 'Transactions', icon: Download, color: 'text-red-600' }
            ].map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                  activeSection === key
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : `text-gray-600 hover:text-gray-900 hover:bg-gray-50 ${color}`
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="animate-fadeIn">
          {renderActiveSection()}
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <BatchTransactionForm
          type={transactionType}
          onClose={() => setShowTransactionForm(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
