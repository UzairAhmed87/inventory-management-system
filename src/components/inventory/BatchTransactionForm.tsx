
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ShoppingCart, Package, Check, ChevronsUpDown, Plus, Trash, FileDown } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ExportUtils } from '@/utils/exportUtils';

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

  const addItem = () => {
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
    
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
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

    // Validate all items
    for (const item of items) {
      if (!item.productId || item.quantity <= 0 || item.price <= 0) {
        toast({
          title: "Error",
          description: "Please fill in all item details correctly",
          variant: "destructive",
        });
        return;
      }

      // Check stock for sales
      if (type === 'sale') {
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

    addTransaction({
      type,
      customerId: type === 'sale' ? customerId : undefined,
      vendorId: type === 'purchase' ? vendorId : undefined,
      items: items.map(({ id, ...item }) => item),
      totalAmount: getTotalAmount(),
      date: new Date(),
    });

    toast({
      title: "Success",
      description: `${type === 'sale' ? 'Sale' : 'Purchase'} transaction added successfully`,
    });

    onClose();
  };

  const exportTransaction = (format: 'excel' | 'pdf') => {
    const customer = type === 'sale' ? customers.find(c => c.id === customerId) : null;
    const vendor = type === 'purchase' ? vendors.find(v => v.id === vendorId) : null;
    
    const data = items.map((item, index) => ({
      'S.No': index + 1,
      'Product Name': item.productName,
      'Quantity': item.quantity,
      'Unit Price (PKR)': item.price.toFixed(2),
      'Total Price (PKR)': item.totalPrice.toFixed(2),
    }));

    const summary = {
      'Transaction Type': type === 'sale' ? 'Sale' : 'Purchase',
      [type === 'sale' ? 'Customer' : 'Vendor']: customer?.name || vendor?.name || 'N/A',
      'Date': new Date().toLocaleDateString(),
      'Total Amount (PKR)': getTotalAmount().toFixed(2),
    };

    if (format === 'excel') {
      ExportUtils.exportToExcel([...data, {}, summary], `${type}_transaction_${new Date().toISOString().split('T')[0]}`);
    } else {
      ExportUtils.exportToPDF([...data, {}, summary], `${type === 'sale' ? 'Sale' : 'Purchase'} Transaction`);
    }
  };

  useEffect(() => {
    if (items.length === 0) {
      addItem();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {type === 'sale' ? (
              <ShoppingCart className="h-5 w-5 text-green-600" />
            ) : (
              <Package className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle>
              {type === 'sale' ? 'New Sale Transaction' : 'New Purchase Transaction'}
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => exportTransaction('excel')}>
              <FileDown className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportTransaction('pdf')}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer/Vendor Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  {type === 'sale' ? 'Customer' : 'Vendor'}
                </Label>
                <Popover open={type === 'sale' ? openCustomer : openVendor} onOpenChange={type === 'sale' ? setOpenCustomer : setOpenVendor}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={type === 'sale' ? openCustomer : openVendor}
                      className="w-full justify-between"
                    >
                      {(type === 'sale' ? customerId : vendorId) ? (
                        <span>
                          {type === 'sale' 
                            ? customers.find(c => c.id === customerId)?.name
                            : vendors.find(v => v.id === vendorId)?.name
                          }
                        </span>
                      ) : (
                        <span>Select {type === 'sale' ? 'customer' : 'vendor'}...</span>
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
                              {item.name} - {item.phoneNo}
                              {item.balance > 0 && (
                                <span className="ml-2 text-sm text-orange-600">
                                  (Balance: PKR {item.balance.toFixed(2)})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium">Transaction Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unit Price (PKR)</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total (PKR)</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
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
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    PKR {getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className={type === 'sale' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {type === 'sale' ? 'Complete Sale' : 'Complete Purchase'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
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
    <tr className="border-b">
      <td className="px-4 py-3">
        <Popover open={openProduct} onOpenChange={setOpenProduct}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openProduct}
              className="w-full justify-between"
              size="sm"
            >
              {item.productId ? (
                <span>{item.productName}</span>
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
                      {product.name} - Stock: {product.quantity}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min="1"
          value={item.quantity.toString()}
          onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
          className="w-20"
          size="sm"
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.price.toString()}
          onChange={(e) => onUpdate(item.id, 'price', e.target.value)}
          className="w-24"
          size="sm"
        />
      </td>
      <td className="px-4 py-3">
        <span className="font-medium">PKR {item.totalPrice.toFixed(2)}</span>
      </td>
      <td className="px-4 py-3">
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
};
