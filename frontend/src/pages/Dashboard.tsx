import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, Users, Truck, TrendingUp, Download, LogOut, User, DollarSign, AlertCircle } from 'lucide-react';
import ProductSection  from '@/components/inventory/ProductSection';
import { CustomerSection } from '@/components/inventory/CustomerSection';
import { VendorSection } from '@/components/inventory/VendorSection';
import { BatchTransactionForm } from '@/components/inventory/BatchTransactionForm';
import { TransactionHistory } from '@/components/inventory/TransactionHistory';
import { OverviewDashboard } from '@/components/inventory/OverviewDashboard';
import { BalanceManager } from '@/components/inventory/BalanceManager';
import { ExpensesSection } from '@/components/inventory/ExpensesSection';
import { useAuthStore } from '@/store/authStore';
import { apiService, Product, Customer, Vendor, Transaction, DashboardSummary } from '@/services/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInventoryStore } from '@/store/inventoryStore';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'sale' | 'purchase' | 'return'>('sale');
  
  // Backend data state
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser, logout, companyName } = useAuthStore();
  const { expenses, balancePayments, fetchExpenses, fetchBalancePayments } = useInventoryStore();

  // Fetch all data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all data in parallel
      const [productsData, customersData, vendorsData, transactionsData, summaryData] = await Promise.all([
        apiService.getProducts(),
        apiService.getCustomers(),
        apiService.getVendors(),
        apiService.getTransactions(),
        apiService.getDashboardSummary(),
      ]);
      setProducts(productsData);
      setCustomers(customersData);
      setVendors(vendorsData);
      setTransactions(transactionsData);
      setDashboardSummary(summaryData);
      fetchExpenses();
      fetchBalancePayments();
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNewTransaction = (type: 'sale' | 'purchase' | 'return') => {
    setTransactionType(type);
    setShowTransactionForm(true);
  };

  // Calculate cash in hand using backend expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCustomerPayments = balancePayments.filter(p => p.type === 'customer_payment').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalVendorPayments = balancePayments.filter(p => p.type === 'vendor_payment').reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashInHand = totalCustomerPayments - totalVendorPayments - totalExpenses;

  const renderActiveSection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={fetchData}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

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
      case 'expenses':
        return <ExpensesSection cashInHandBeforeExpenses={cashInHand} />;
      default:
        return <OverviewDashboard cashInHand={cashInHand} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-xl border-b border-gray-200 backdrop-blur-sm">
        <div className="max-w-7xl my-3 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/logo.svg" alt="UA Trackistory Logo" className="h-12 w-auto object-contain" />
              <div>
                {/* Only show the logo, remove slogan text */}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex space-x-3">
                <Button 
                  onClick={() => handleNewTransaction('sale')}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg transform hover:scale-105 transition-all duration-200"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Sale
                </Button>
                <Button 
                  onClick={() => handleNewTransaction('purchase')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transform hover:scale-105 transition-all duration-200"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Purchase
                </Button>
                <Button
                  onClick={() => handleNewTransaction('return')}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Return
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{companyName || currentUser}</span>
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
              { key: 'transactions', label: 'Transactions', icon: Download, color: 'text-red-600' },
              { key: 'expenses', label: 'Expenses', icon: DollarSign, color: 'text-blue-600' },
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
