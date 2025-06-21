import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ShoppingCart, Package, Check, ChevronsUpDown, Plus, Trash } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BillSuccessDialog } from './BillSuccessDialog';

interface BatchTransactionFormProps {
  type: 'sale' | 'purchase';
  onClose: () => void;
}

interface TransactionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export const BatchTransactionForm: React.FC<BatchTransactionFormProps> = ({ type, onClose }) => {
  const { products, customers, vendors, addTransaction } = useInventoryStore();
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openVendor, setOpenVendor] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);

  const addItem = () => {
    // Only add if all existing items are properly filled
    const hasIncompleteItems = items.some(item => 
      !item.productId || item.quantity <= 0 || item.price <= 0
    );
    
    if (hasIncompleteItems && items.length > 0) {
      toast({
        title: "Complete Current Items",
        description: "Please fill in all details for existing items before adding new ones",
        variant: "destructive",
      });
      return;
    }

    const newItem: TransactionItem = {
      id: crypto.randomUUID(),
      productId: '',
      productName: '',
      quantity: 1,
      price: 0,
      totalPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof TransactionItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item };
        
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          updatedItem.productId = value as string;
          updatedItem.productName = product?.name || '';
        } else if (field === 'quantity') {
          updatedItem.quantity = typeof value === 'string' ? Number(value) : value;
        } else if (field === 'price') {
          updatedItem.price = typeof value === 'string' ? Number(value) : value;
        }
        
        // Recalculate total price when quantity or price changes
        if (field === 'quantity' || field === 'price') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.price;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty/incomplete items
    const validItems = items.filter(item => 
      item.productId && item.quantity > 0 && item.price > 0
    );

    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid item",
        variant: "destructive",
      });
      return;
    }

    if (type === 'sale' && !customerId) {
      toast({
        title: "Error",
        description: "Please select a customer for sales",
        variant: "destructive",
      });
      return;
    }

    if (type === 'purchase' && !vendorId) {
      toast({
        title: "Error",
        description: "Please select a vendor for purchases",
        variant: "destructive",
      });
      return;
    }

    // Check stock for sales
    if (type === 'sale') {
      for (const item of validItems) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.quantity < item.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${product.quantity} units available for ${product.name}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    const transaction = {
      type,
      customerId: type === 'sale' ? customerId : undefined,
      vendorId: type === 'purchase' ? vendorId : undefined,
      items: validItems.map(({ id, ...item }) => item),
      totalAmount: validItems.reduce((sum, item) => sum + item.totalPrice, 0),
      date: new Date(),
    };

    addTransaction(transaction);

    // Get the latest transaction (the one we just added) for the success dialog
    const customer = type === 'sale' ? customers.find(c => c.id === customerId) : undefined;
    const vendor = type === 'purchase' ? vendors.find(v => v.id === vendorId) : undefined;
    
    // Create transaction object with invoice number for success dialog
    const transactionWithInvoice = {
      ...transaction,
      invoiceNumber: `${type === 'sale' ? 'INV' : 'PUR'}${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}001`, // This will be generated properly in store
      previousBalance: customer?.balance || vendor?.balance || 0,
      newBalance: (customer?.balance || vendor?.balance || 0) + transaction.totalAmount,
    };

    setCompletedTransaction({
      ...transactionWithInvoice,
      customer,
      vendor
    });
    setShowSuccessDialog(true);

    toast({
      title: "Success",
      description: `${type === 'sale' ? 'Sale' : 'Purchase'} transaction completed successfully`,
    });
  };

  useEffect(() => {
    if (items.length === 0) {
      addItem();
    }
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              {type === 'sale' ? (
                <ShoppingCart className="h-6 w-6" />
              ) : (
                <Package className="h-6 w-6" />
              )}
              <CardTitle className="text-xl">
                {type === 'sale' ? 'New Sale Transaction' : 'New Purchase Transaction'}
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
                      {type === 'sale' ? 'Customer' : 'Vendor'}
                    </Label>
                    <Popover open={type === 'sale' ? openCustomer : openVendor} onOpenChange={type === 'sale' ? setOpenCustomer : setOpenVendor}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={type === 'sale' ? openCustomer : openVendor}
                          className="w-full justify-between mt-1 h-10"
                        >
                          {(type === 'sale' ? customerId : vendorId) ? (
                            <span>
                              {type === 'sale' 
                                ? customers.find(c => c.id === customerId)?.name
                                : vendors.find(v => v.id === vendorId)?.name
                              }
                            </span>
                          ) : (
                            <span className="text-gray-500">Select {type === 'sale' ? 'customer' : 'vendor'}...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 z-[60]">
                        <Command>
                          <CommandInput placeholder={`Search ${type === 'sale' ? 'customer' : 'vendor'}...`} />
                          <CommandList>
                            <CommandEmpty>No {type === 'sale' ? 'customer' : 'vendor'} found.</CommandEmpty>
                            <CommandGroup>
                              {(type === 'sale' ? customers : vendors).map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={item.name}
                                  onSelect={() => {
                                    if (type === 'sale') {
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
                                      (type === 'sale' ? customerId : vendorId) === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium">{item.name} ({item.uniqueId})</p>
                                    <p className="text-sm text-gray-500">{item.phoneNo}</p>
                                    {item.balance > 0 && (
                                      <p className="text-sm text-orange-600">
                                        Balance: PKR {item.balance.toFixed(2)}
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
                    <Button type="button" onClick={addItem} className="w-full bg-blue-600 hover:bg-blue-700">
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
                    <span className="text-3xl font-bold text-blue-900">
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
                  className={`px-8 ${type === 'sale' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} shadow-lg`}
                >
                  {type === 'sale' ? 'Complete Sale' : 'Complete Purchase'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <BillSuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
        transaction={completedTransaction}
        customer={completedTransaction?.customer}
        vendor={completedTransaction?.vendor}
        type={type}
      />
    </>
  );
};

interface TransactionItemRowProps {
  item: TransactionItem;
  products: any[];
  type: 'sale' | 'purchase';
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
              {item.productId ? (
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
                        onUpdate(item.id, 'productId', product.id);
                        setOpenProduct(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          item.productId === product.id ? "opacity-100" : "opacity-0"
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
          min="1"
          value={item.quantity.toString()}
          onChange={(e) => onUpdate(item.id, 'quantity', Number(e.target.value))}
          className="w-20"
          size="sm"
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
          size="sm"
        />
      </td>
      <td className="px-6 py-4">
        <span className="font-semibold text-lg">PKR {item.totalPrice.toFixed(2)}</span>
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
