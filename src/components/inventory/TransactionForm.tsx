
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ShoppingCart, Package } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { toast } from '@/hooks/use-toast';

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
      if (product) {
        setFormData(prev => ({ ...prev, price: product.price.toString() }));
      }
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
            {/* Customer/Vendor Selection */}
            <div>
              <Label>
                {type === 'sale' ? 'Customer' : 'Vendor'}
              </Label>
              <Select
                value={type === 'sale' ? formData.customerId : formData.vendorId}
                onValueChange={(value) => 
                  setFormData(prev => ({
                    ...prev,
                    [type === 'sale' ? 'customerId' : 'vendorId']: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${type === 'sale' ? 'customer' : 'vendor'}`} />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'sale' ? customers : vendors).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.phoneNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            <div>
              <Label>Product</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - Stock: {product.quantity} - ${product.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="price">Unit Price</Label>
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
