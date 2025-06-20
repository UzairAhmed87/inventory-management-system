
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ShoppingCart, Package, Check, ChevronsUpDown } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  type: 'sale' | 'purchase';
  onClose: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ type, onClose }) => {
  const { products, customers, vendors, addTransaction } = useInventoryStore();
  const [formData, setFormData] = useState({
    productId: '',
    customerId: '',
    vendorId: '',
    quantity: '',
    price: '',
  });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [openProduct, setOpenProduct] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openVendor, setOpenVendor] = useState(false);

  useEffect(() => {
    if (formData.quantity && formData.price) {
      setTotalPrice(parseInt(formData.quantity) * parseFloat(formData.price));
    } else {
      setTotalPrice(0);
    }
  }, [formData.quantity, formData.price]);

  useEffect(() => {
    if (formData.productId) {
      const product = products.find(p => p.id === formData.productId);
      setSelectedProduct(product);
    }
  }, [formData.productId, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.quantity || !formData.price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (type === 'sale' && !formData.customerId) {
      toast({
        title: "Error",
        description: "Please select a customer for sales",
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

    // Check stock for sales
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

    addTransaction({
      type,
      productId: formData.productId,
      productName: selectedProduct?.name || '',
      customerId: type === 'sale' ? formData.customerId : undefined,
      vendorId: type === 'purchase' ? formData.vendorId : undefined,
      quantity,
      price,
      totalPrice,
      date: new Date(),
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
            ) : (
              <Package className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle>
              {type === 'sale' ? 'New Sale' : 'New Purchase'}
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
                    {(type === 'sale' ? formData.customerId : formData.vendorId) ? (
                      <span>
                        {type === 'sale' 
                          ? customers.find(c => c.id === formData.customerId)?.name
                          : vendors.find(v => v.id === formData.vendorId)?.name
                        }
                      </span>
                    ) : (
                      <span>Select {type === 'sale' ? 'customer' : 'vendor'}...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
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
                              setFormData(prev => ({
                                ...prev,
                                [type === 'sale' ? 'customerId' : 'vendorId']: item.id
                              }));
                              if (type === 'sale') {
                                setOpenCustomer(false);
                              } else {
                                setOpenVendor(false);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                (type === 'sale' ? formData.customerId : formData.vendorId) === item.id ? "opacity-100" : "opacity-0"
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
            </div>

            {/* Product Selection with Search */}
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

            {/* Stock Warning for Sales */}
            {type === 'sale' && selectedProduct && selectedProduct.quantity <= 10 && (
              <div className="bg-orange-100 text-orange-700 text-sm px-3 py-2 rounded">
                Warning: Low stock ({selectedProduct.quantity} units remaining)
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={type === 'sale' && selectedProduct ? selectedProduct.quantity : undefined}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
                required
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price">Unit Price ($)</Label>
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

            {/* Total Price Display */}
            {totalPrice > 0 && (
              <div className="bg-gray-100 p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Price:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${totalPrice.toFixed(2)}
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
