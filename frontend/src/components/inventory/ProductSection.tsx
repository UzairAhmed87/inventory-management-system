import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportUtils } from '@/utils/exportUtils';
import { apiService, Product, safeNumber, StockReportEntry } from '@/services/api';
import { useToast } from '@/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { useInventoryStore } from '@/store/inventoryStore';

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

export default function ProductSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [formData, setFormData] = useState({
    name: '',
    quantity: ''
  });
  const [showStockReport, setShowStockReport] = useState(false);
  const [stockReportDate, setStockReportDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [stockReport, setStockReport] = useState<StockReportEntry[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showStockReportDialog, setShowStockReportDialog] = useState(false);
  const companyName = useAuthStore((state) => state.companyName) || useAuthStore((state) => state.currentUser) || 'Company Name';
  const setGlobalLoader = useInventoryStore(state => state.setGlobalLoader);

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }
    const quantity = safeNumber(formData.quantity);
    setGlobalLoader(true);
    try {
      if (editingProduct) {
        await apiService.updateProduct(editingProduct.id, {
          name: formData.name,
          quantity: quantity
        });
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        await apiService.createProduct({
          name: formData.name,
          quantity: quantity
        });
        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      let message = err?.message || 'Failed to save product';
      if (
        message.toLowerCase().includes('already exists') ||
        message.toLowerCase().includes('duplicate key value violates unique constraint')
      ) {
        message = 'A product with this name already exists.';
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      console.error('Error saving product:', err);
    } finally {
      setGlobalLoader(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      quantity: product.quantity.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiService.deleteProduct(id);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      fetchProducts();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
      console.error('Error deleting product:', err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', quantity: '' });
    setEditingProduct(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = (() => {
      switch (stockFilter) {
        case 'in-stock':
          return safeNumber(product.quantity) > 0;
        case 'low-stock':
          return safeNumber(product.quantity) > 0 && safeNumber(product.quantity) <= 5;
        case 'out-of-stock':
          return safeNumber(product.quantity) === 0;
        default:
          return true;
      }
    })();
    return matchesSearch && matchesFilter;
  });

  const fetchStockReport = async (date: string) => {
    setLoadingStock(true);
    try {
      // Send date as end of day to include all transactions for the selected date
      const endOfDay = date ? `${date}T23:59:59` : undefined;
      const data = await apiService.getStockReport(endOfDay || date);
      setStockReport(data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch stock report', variant: 'destructive' });
    } finally {
      setLoadingStock(false);
    }
  };

  const handleOpenStockReport = () => {
    fetchStockReport(stockReportDate);
    setShowStockReportDialog(true);
  };

  const handleStockReportDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStockReportDate(e.target.value);
    fetchStockReport(e.target.value);
  };

  const exportStockReport = () => {
    const data = stockReport.map(item => ({
      'Product Name': item.product_name,
      'Stock': item.stock
    }));
    ExportUtils.exportToExcel(data, `stock-report-${stockReportDate}`);
  };

  const exportStockReportPDF = () => {
    const data = stockReport.map(item => ({
      'Product Name': item.product_name,
      'Stock': item.stock
    }));
    ExportUtils.exportToPDF(data, 'Stock Report', `As of ${stockReportDate}`, undefined, companyName);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading products...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Products</CardTitle>
        <div className="flex gap-2">
          <Button onClick={handleOpenStockReport} variant="secondary">Stock Report</Button>
          <Button onClick={() => setIsDialogOpen(true)}>Add Product</Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{safeNumber(product.quantity)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      style={{backgroundColor:'green',color:'white'}}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      style={{backgroundColor:'red',color:'white'}}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={showStockReportDialog} onOpenChange={setShowStockReportDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Stock Report</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mb-4">
              <Label htmlFor="stock-report-date">As of date:</Label>
              <Input
                id="stock-report-date"
                type="date"
                value={stockReportDate}
                onChange={handleStockReportDateChange}
                max={new Date().toISOString().split('T')[0]}
              />
              <Button onClick={exportStockReport} size="sm" variant="outline">Export Excel</Button>
              <Button onClick={exportStockReportPDF} size="sm" variant="outline">Export PDF</Button>
            </div>
            {loadingStock ? (
              <div>Loading...</div>
            ) : (
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockReport.length === 0 ? (
                      <TableRow><TableCell colSpan={2}>No data</TableCell></TableRow>
                    ) : stockReport.map((item) => (
                      <TableRow key={item.product_name}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Enter quantity"
                min="0"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
