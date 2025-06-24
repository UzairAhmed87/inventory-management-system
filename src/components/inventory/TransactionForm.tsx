import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ShoppingCart, Package, Check, ChevronsUpDown } from 'lucide-react';
import { useInventoryStore, Product, Transaction } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ExportUtils } from '@/utils/exportUtils';

interface TransactionFormProps {
  type: 'sale' | 'purchase' | 'return';
  onClose: () => void;
  customerId?: string;
  originalTransaction?: any;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ type, onClose, customerId, originalTransaction }) => {
  const { products, customers, vendors, addTransaction, fetchProducts, fetchCustomers, fetchVendors, transactions } = useInventoryStore();
  const [formData, setFormData] = useState({
    productId: '',
    customerId: customerId || '',
    vendorId: '',
    quantity: '',
    price: '',
  });
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [showReturnBill, setShowReturnBill] = useState(false);
  const [returnTransactionData, setReturnTransactionData] = useState<any>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [openProduct, setOpenProduct] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openVendor, setOpenVendor] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchVendors();
  }, [fetchProducts, fetchCustomers, fetchVendors]);

  useEffect(() => {
    if (customerId) {
      setFormData(prev => ({ ...prev, customerId }));
    }
  }, [customerId]);

  useEffect(() => {
    if (type !== 'return') {
      if (formData.quantity && formData.price) {
        setTotalPrice(parseInt(formData.quantity) * parseFloat(formData.price));
      } else {
        setTotalPrice(0);
      }
    }
  }, [formData.quantity, formData.price, type]);

  useEffect(() => {
    if (type === 'return') {
      const total = returnItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0);
      setTotalPrice(total);
    }
  }, [returnItems, type]);

  useEffect(() => {
    if (formData.productId) {
      const product = products.find(p => p.id === formData.productId);
      setSelectedProduct(product);
    }
  }, [formData.productId, products]);

  useEffect(() => {
    if (type === 'return' && originalTransaction && originalTransaction.items && originalTransaction.items.length > 0) {
      // Calculate how much has already been returned for each product in this transaction
      const previousReturns = transactions.filter(
        t => t.type === 'return' && t.originalTransactionId === originalTransaction.id
      );
      setReturnItems(
        originalTransaction.items.map((item: any) => {
          // Sum up all previous returns for this product in this transaction
          const returnedQty = previousReturns.reduce((sum, retTx) => {
            const retItem = retTx.items.find((i: any) => i.productId === item.productId);
            return sum + (retItem ? retItem.quantity : 0);
          }, 0);
          const maxReturnable = item.quantity - returnedQty;
          return {
            ...item,
            maxReturnable,
            returnQty: '',
          };
        })
      );
    }
  }, [type, originalTransaction, transactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'return') {
      // Always use the originalTransaction's customerId/vendorId for returns
      const customerId = originalTransaction.customerId || undefined;
      const vendorId = originalTransaction.vendorId || undefined;
      let hasReturn = false;
      for (const item of returnItems) {
        const origQty = item.maxReturnable;
        const retQty = parseInt(item.returnQty || '0');
        if (retQty > 0) hasReturn = true;
        if (retQty < 0 || retQty > origQty) {
          toast({
            title: 'Invalid Return Quantity',
            description: `You can only return up to ${origQty} units for ${item.productName}`,
            variant: 'destructive',
          });
          return;
        }
      }
      if (!hasReturn) {
        toast({
          title: 'No Items Selected',
          description: 'Please enter a return quantity for at least one item.',
          variant: 'destructive',
        });
        return;
      }
      const itemsToReturn = returnItems.filter(item => parseInt(item.returnQty) > 0).map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: parseInt(item.returnQty),
        price: item.price,
        totalPrice: parseInt(item.returnQty) * item.price,
      }));
      const newTx = await addTransaction({
        type,
        customerId,
        vendorId,
        items: itemsToReturn,
        totalAmount: itemsToReturn.reduce((sum, i) => sum + i.totalPrice, 0),
        date: new Date().toISOString(),
        originalTransactionId: originalTransaction.id,
      });
      toast({
        title: 'Success',
        description: 'Return transaction added successfully',
      });
      setReturnTransactionData(newTx);
      setShowReturnBill(true);
      return;
    }

    if (!formData.productId || !formData.quantity || !formData.price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if ((type === 'sale') && !formData.customerId) {
      toast({
        title: "Error",
        description: `Please select a customer for sales`,
        variant: "destructive",
      });
      return;
    }
    if (type === 'purchase' && !formData.vendorId) {
      toast({
        title: "Error",
        description: "Please select a vendor for purchases",
        variant: "destructive",
      });
      return;
    }
    const quantity = parseInt(formData.quantity);
    const price = parseFloat(formData.price);
    if (type === 'sale' && selectedProduct) {
      if (selectedProduct.quantity < quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${selectedProduct.quantity} units available in stock`,
          variant: "destructive",
        });
        return;
      }
    }
    const newTx = await addTransaction({
      type,
      customerId: type === 'sale' ? formData.customerId : undefined,
      vendorId: type === 'purchase' ? formData.vendorId : undefined,
      items: [{
        productId: formData.productId,
        productName: selectedProduct?.name || '',
        quantity,
        price,
        totalPrice,
      }],
      totalAmount: totalPrice,
      date: new Date().toISOString(),
    });
    toast({
      title: "Success",
      description: `${type === 'sale' ? 'Sale' : 'Purchase'} transaction added successfully`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {type === 'sale' ? (
              <ShoppingCart className="h-5 w-5 text-green-600" />
            ) : type === 'return' ? (
              <ShoppingCart className="h-5 w-5 text-yellow-600" />
            ) : (
              <Package className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle>
              {type === 'sale' ? 'New Sale' : type === 'return' ? 'Product Return' : 'New Purchase'}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer/Vendor Selection with Search */}
            <div>
              <Label>{type === 'sale' ? 'Customer' : type === 'purchase' ? 'Vendor' : originalTransaction?.customerId ? 'Customer' : 'Vendor'}</Label>
              {type === 'return' && originalTransaction ? (
                <Input
                  value={originalTransaction.customerId
                    ? customers.find(c => c.id === originalTransaction.customerId)?.name || ''
                    : vendors.find(v => v.id === originalTransaction.vendorId)?.name || ''}
                  readOnly
                  className="w-full bg-gray-100 font-semibold"
                />
              ) : type === 'sale' ? (
                <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCustomer}
                      className="w-full justify-between"
                      disabled={!!customerId}
                    >
                      {formData.customerId ? (
                        <span>{customers.find(c => c.id === formData.customerId)?.name}</span>
                      ) : (
                        <span>Select customer...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, customerId: item.id }));
                                setOpenCustomer(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.customerId === item.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {item.name} - {item.phoneNo}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover open={openVendor} onOpenChange={setOpenVendor}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openVendor}
                      className="w-full justify-between"
                    >
                      {formData.vendorId ? (
                        <span>{vendors.find(v => v.id === formData.vendorId)?.name}</span>
                      ) : (
                        <span>Select vendor...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search vendor..." />
                      <CommandList>
                        <CommandEmpty>No vendor found.</CommandEmpty>
                        <CommandGroup>
                          {vendors.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, vendorId: item.id }));
                                setOpenVendor(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.vendorId === item.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {item.name} - {item.phoneNo}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Product(s) Selection with Search or Return Items Table */}
            {type === 'return' && originalTransaction ? (
              <div>
                <Label>Return Items</Label>
                <div className="border rounded bg-gray-50 p-2">
                  {returnItems.map((item, idx) => (
                    <div key={item.productId} className="flex items-center space-x-2 mb-2">
                      <div className="flex-1">
                        <span className="font-medium">{item.productName}</span>
                        <span className="ml-2 text-xs text-gray-500">(Purchased: {item.quantity}, Price: PKR {item.price})</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={item.maxReturnable}
                        step={1}
                        value={item.returnQty}
                        onChange={e => {
                          const val = e.target.value;
                          setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, returnQty: val } : it));
                        }}
                        className="w-24"
                        placeholder={`Max: ${item.maxReturnable}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Label>Product</Label>
                <Popover open={openProduct} onOpenChange={setOpenProduct}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProduct}
                      className="w-full justify-between"
                    >
                      {formData.productId ? (
                        <span>{selectedProduct?.name}</span>
                      ) : (
                        <span>Select product...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
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
                                setFormData(prev => ({ ...prev, productId: product.id }));
                                setOpenProduct(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.productId === product.id ? "opacity-100" : "opacity-0"
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
              </div>
            )}

            {/* Stock Warning for Sales */}
            {type === 'sale' && selectedProduct && selectedProduct.quantity <= 10 && (
              <div className="bg-orange-100 text-orange-700 text-sm px-3 py-2 rounded">
                Warning: Low stock ({selectedProduct.quantity} units remaining)
              </div>
            )}

            {/* Quantity and Price fields are handled in the return items table for returns */}
            {type !== 'return' && (
              <>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    max={type === 'sale' && selectedProduct ? selectedProduct.quantity : undefined}
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder={'Enter quantity'}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Unit Price (PKR)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="Enter unit price"
                    required
                  />
                </div>
              </>
            )}

            {/* Total Price Display */}
            {totalPrice > 0 && (
              <div className="bg-gray-100 p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Price:</span>
                  <span className="text-lg font-bold text-blue-600">
                    PKR {totalPrice.toFixed(2)}
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
                className={type === 'sale' ? 'bg-green-600 hover:bg-green-700' : type === 'return' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {type === 'sale' ? 'Complete Sale' : type === 'return' ? 'Complete Return' : 'Complete Purchase'}
              </Button>
            </div>
          </form>

          {/* Show PDF bill for return after completion */}
          {showReturnBill && returnTransactionData && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  const customer = customers.find(c => c.id === returnTransactionData.customerId);
                  const vendor = vendors.find(v => v.id === returnTransactionData.vendorId);
                  ExportUtils.exportTransactionBill(returnTransactionData, customer, vendor, 'pdf');
                }}
                className=" bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Download Return Bill (PDF)
              </Button>
              <Button
                variant="outline"
                className="ml-2"
                onClick={() => {
                  setShowReturnBill(false);
                  setReturnTransactionData(null);
                  onClose();
                }}
              >
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
