import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ShoppingCart, Package, Check, ChevronsUpDown, Plus, Trash } from 'lucide-react';
import { useInventoryStore, Product, Customer, Vendor, Transaction } from '@/store/inventoryStore';
import { toast } from '../ui/use-toast';
import { cn } from '@/lib/utils';
import { BillSuccessDialog } from './BillSuccessDialog';
import type { CompletedBatchTransaction } from '@/types';

// Local type for transaction items (matches Transaction.items[])
type TransactionItem = {
  id: string; // local unique id for UI
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
};

interface BatchTransactionFormProps {
  type: 'sale' | 'purchase' | 'return';
  onClose: () => void;
  transaction?: Transaction; // for edit mode
}

export const BatchTransactionForm: React.FC<BatchTransactionFormProps> = ({ type, onClose, transaction }) => {
  const {
    products,
    customers,
    vendors,
    addTransaction,
    updateTransaction,
    fetchProducts,
    fetchCustomers,
    fetchVendors,
    setGlobalLoader,
  } = useInventoryStore();

  const isEditMode = !!transaction;
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openVendor, setOpenVendor] = useState(false);
  const [returnPartyType, setReturnPartyType] = useState<'customer' | 'vendor'>('customer');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<CompletedBatchTransaction | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Add a new empty item row
  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productName: '',
        quantity: 1,
        price: 0,
        totalPrice: 0,
      },
    ]);
  };

  // Remove an item row
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Update an item field
  const updateItem = (id: string, field: keyof TransactionItem, value: string | number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              totalPrice:
                field === 'quantity' || field === 'price'
                  ? (field === 'quantity'
                      ? Number(value)
                      : item.quantity) * (field === 'price' ? Number(value) : item.price)
                  : item.quantity * item.price,
            }
          : item
      )
    );
  };

  // Calculate total amount
  const getTotalAmount = () => items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalLoader(true);
    setTimeout(() => {
      setPendingSubmit(true);
    }, 0);
  };

  useEffect(() => {
    if (!pendingSubmit) return;
    const runTransaction = async () => {
      if (items.length === 0 || items.some(item => !item.productName || !item.quantity || !item.price)) {
        toast({ title: 'Error', description: 'Please fill all item fields', variant: 'destructive' });
        setGlobalLoader(false);
        setPendingSubmit(false);
        return;
      }
      if ((type === 'sale' || (type === 'return' && returnPartyType === 'customer')) && !customerId) {
        toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
        setGlobalLoader(false);
        setPendingSubmit(false);
        return;
      }
      if ((type === 'purchase' || (type === 'return' && returnPartyType === 'vendor')) && !vendorId) {
        toast({ title: 'Error', description: 'Please select a vendor', variant: 'destructive' });
        setGlobalLoader(false);
        setPendingSubmit(false);
        return;
      }
      const transactionData: Omit<Transaction, 'id' | 'invoiceNumber' | 'previousBalance' | 'newBalance'> = {
        type,
        customer_name: (type === 'sale' || (type === 'return' && returnPartyType === 'customer')) ? customers.find(c => c.id === customerId)?.name : undefined,
        vendor_name: (type === 'purchase' || (type === 'return' && returnPartyType === 'vendor')) ? vendors.find(v => v.id === vendorId)?.name : undefined,
        items: items.map(item => ({
          productName: item.productName,
          quantity: Number(item.quantity),
          price: Number(item.price),
          totalPrice: Number(item.totalPrice),
        })),
        totalAmount: Number(getTotalAmount()),
        date: new Date().toISOString(),
        originalTransactionId: isEditMode && transaction?.originalTransactionId ? transaction.originalTransactionId : undefined,
      };
      if (isEditMode && transaction) {
        try {
          await updateTransaction(transaction.id, transactionData);
          toast({ title: 'Success', description: 'Transaction updated successfully' });
          setGlobalLoader(false);
          setPendingSubmit(false);
          onClose();
          return;
        } catch (err: any) {
          toast({ title: 'Error', description: err.message || 'Transaction failed', variant: 'destructive' });
          setGlobalLoader(false);
          setPendingSubmit(false);
          return;
        }
      } else {
        try {
          const newTransaction = await addTransaction(transactionData);
          if (!newTransaction.items || !Array.isArray(newTransaction.items)) {
            toast({ title: 'Error', description: 'Transaction data incomplete. Please try again.', variant: 'destructive' });
            setGlobalLoader(false);
            setPendingSubmit(false);
            return;
          }
          setCompletedTransaction({
            ...newTransaction,
            customer: customers.find(c => c.name === newTransaction.customer_name) || null,
            customer_name: newTransaction.customer_name,
            vendor: vendors.find(v => v.name === newTransaction.vendor_name) || null,
            vendor_name: newTransaction.vendor_name,
          });
          setShowSuccessDialog(true);
          toast({ title: 'Success', description: `${type === 'sale' ? 'Sale' : type === 'purchase' ? 'Purchase' : 'Return'} transaction completed successfully` });
        } catch (err: any) {
          toast({ title: 'Error', description: err.message || 'Transaction failed', variant: 'destructive' });
        }
        setGlobalLoader(false);
        setPendingSubmit(false);
      }
    };
    runTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSubmit]);

  // On mount, fetch data and set initial state
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchVendors();
    if (isEditMode && transaction) {
      setItems(transaction.items.map(item => ({
        id: crypto.randomUUID(),
        ...item,
      })));
      if (transaction.type === 'sale' && transaction.customer_name) {
        const customer = customers.find(c => c.name === transaction.customer_name);
        if (customer) setCustomerId(customer.id);
      }
      if (transaction.type === 'purchase' && transaction.vendor_name) {
        const vendor = vendors.find(v => v.name === transaction.vendor_name);
        if (vendor) setVendorId(vendor.id);
      }
    } else if (items.length === 0) {
      addItem();
    }
    // eslint-disable-next-line
  }, [fetchProducts, fetchCustomers, fetchVendors, isEditMode, transaction]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-4 ${type === 'purchase' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : type === 'sale' ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-yellow-500 to-yellow-600'} text-white rounded-t-lg`}>
            <div className="flex items-center space-x-3">
              {type === 'sale' ? (
                <ShoppingCart className="h-6 w-6" />
              ) : type === 'purchase' ? (
                <Package className="h-6 w-6" />
              ) : (
                <Package className="h-6 w-6 text-yellow-900" />
              )}
              <CardTitle className="text-xl">
                {isEditMode
                  ? type === 'sale' ? 'Edit Sale Transaction'
                    : type === 'purchase' ? 'Edit Purchase Transaction'
                    : 'Edit Return Transaction'
                  : type === 'sale' ? 'New Sale Transaction'
                    : type === 'purchase' ? 'New Purchase Transaction'
                    : 'New Return Transaction'}
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer/Vendor Selection */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">
                      {type === 'sale' ? 'Customer' : type === 'purchase' ? 'Vendor' : 'Return Party'}
                    </Label>
                    {type === 'return' && (
                      <div className="flex items-center gap-4 mb-2 mt-1">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={returnPartyType === 'customer'}
                            onChange={() => setReturnPartyType('customer')}
                          />
                          Customer
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={returnPartyType === 'vendor'}
                            onChange={() => setReturnPartyType('vendor')}
                          />
                          Vendor
                        </label>
                      </div>
                    )}
                    <Popover
                      open={type === 'sale' ? openCustomer : type === 'purchase' ? openVendor : returnPartyType === 'customer' ? openCustomer : openVendor}
                      onOpenChange={type === 'sale' ? setOpenCustomer : type === 'purchase' ? setOpenVendor : returnPartyType === 'customer' ? setOpenCustomer : setOpenVendor}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={type === 'sale' ? openCustomer : type === 'purchase' ? openVendor : returnPartyType === 'customer' ? openCustomer : openVendor}
                          className="w-full justify-between mt-1 h-10"
                        >
                          {(type === 'sale' ? customerId : type === 'purchase' ? vendorId : returnPartyType === 'customer' ? customerId : vendorId) ? (
                            <span>
                              {type === 'sale'
                                ? customers.find(c => c.id === customerId)?.name
                                : type === 'purchase'
                                  ? vendors.find(v => v.id === vendorId)?.name
                                  : returnPartyType === 'customer'
                                    ? customers.find(c => c.id === customerId)?.name
                                    : vendors.find(v => v.id === vendorId)?.name
                              }
                            </span>
                          ) : (
                            <span className="text-gray-500">Select {type === 'sale' ? 'customer' : type === 'purchase' ? 'vendor' : returnPartyType === 'customer' ? 'customer' : 'vendor'}...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 z-[60]">
                        <Command>
                          <CommandInput placeholder={`Search ${type === 'sale' ? 'customer' : type === 'purchase' ? 'vendor' : returnPartyType === 'customer' ? 'customer' : 'vendor'}...`} />
                          <CommandList>
                            <CommandEmpty>No {type === 'sale' ? 'customer' : type === 'purchase' ? 'vendor' : returnPartyType === 'customer' ? 'customer' : 'vendor'} found.</CommandEmpty>
                            <CommandGroup>
                              {(type === 'sale' ? customers : type === 'purchase' ? vendors : returnPartyType === 'customer' ? customers : vendors).map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={item.name}
                                  onSelect={() => {
                                    if (type === 'sale' || (type === 'return' && returnPartyType === 'customer')) {
                                      setCustomerId(item.id);
                                      setOpenCustomer(false);
                                    } else {
                                      setVendorId(item.id);
                                      setOpenVendor(false);
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (type === 'sale' || (type === 'return' && returnPartyType === 'customer') ? customerId : vendorId) === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium">{item.name} ({item.uniqueId})</p>
                                    <p className="text-sm text-gray-500">{item.phoneNo}</p>
                                    {item.balance > 0 && (
                                      <p className="text-sm text-orange-600">
                                        Balance: {Number(item.balance || 0).toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addItem} className={`w-full ${type === 'purchase' ? 'bg-blue-600 hover:bg-blue-700' : type === 'sale' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">Transaction Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Quantity</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Unit Price (PKR)</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total (PKR)</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <TransactionItemRow
                          key={item.id}
                          item={item}
                          products={products}
                          type={type}
                          onUpdate={updateItem}
                          onRemove={removeItem}
                          canRemove={items.length > 1}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Amount */}
              {getTotalAmount() > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold text-blue-800">Total Amount:</span>
                    <span className="text-xl font-bold text-blue-900">
                      PKR {getTotalAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="px-8">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className={`px-8 ${type === 'sale' ? 'bg-green-600 hover:bg-green-700' : type === 'purchase' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-500 hover:bg-yellow-600 text-white'} shadow-lg`}
                >
                  {isEditMode
                    ? (type === 'sale' ? 'Update Sale' : type === 'purchase' ? 'Update Purchase' : 'Update Return')
                    : (type === 'sale' ? 'Complete Sale' : type === 'purchase' ? 'Complete Purchase' : 'Complete Return')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      {isEditMode ? null : (
        <BillSuccessDialog
          isOpen={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            onClose();
          }}
          transaction={completedTransaction}
        />
      )}
    </>
  );
};

interface TransactionItemRowProps {
  item: TransactionItem;
  products: Product[];
  type: 'sale' | 'purchase' | 'return';
  onUpdate: (id: string, field: keyof TransactionItem, value: string | number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const TransactionItemRow: React.FC<TransactionItemRowProps> = ({
  item, products, type, onUpdate, onRemove, canRemove
}) => {
  const [openProduct, setOpenProduct] = useState(false);

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <Popover open={openProduct} onOpenChange={setOpenProduct}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openProduct}
              className="w-full justify-between h-10"
              size="sm"
            >
              {item.productName ? (
                <span className="truncate">{item.productName}</span>
              ) : (
                <span className="text-gray-500">Select product...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 z-[70]">
            <Command>
              <CommandInput placeholder="Search product..." />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => {
                        onUpdate(item.id, 'productName', product.name);
                        setOpenProduct(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          item.productName === product.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">Stock: {product.quantity}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-6 py-4">
         <Input
          type="number"
          min="0.01"
          step="0.01"
          value={item.quantity.toString()}
          onChange={(e) => onUpdate(item.id, 'quantity', Number(e.target.value))}
           className="w-20"
        />
      </td>
      <td className="px-6 py-4">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.price.toString()}
          onChange={(e) => onUpdate(item.id, 'price', Number(e.target.value))}
          className="w-24"
        />
      </td>
      <td className="px-6 py-4">
        <span className="font-semibold text-lg"> {item.totalPrice.toFixed(2)}</span>
      </td>
      <td className="px-6 py-4">
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
};
