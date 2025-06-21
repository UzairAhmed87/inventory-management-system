
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
  
  const { initializeStore } = useInventoryStore();
  const { currentUser, logout } = useAuthStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management System</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleNewTransaction('sale')}
                  className="bg-green-600 hover:bg-green-700 shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Sale
                </Button>
                <Button 
                  onClick={() => handleNewTransaction('purchase')}
                  className="bg-blue-600 hover:bg-blue-700 shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Purchase
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{currentUser}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
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
          <nav className="flex space-x-1 bg-white rounded-xl p-2 shadow-lg border border-gray-200">
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
                className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === key
                    ? 'bg-blue-600 text-white shadow-md'
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
        <BatchTransactionForm
          type={transactionType}
          onClose={() => setShowTransactionForm(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
