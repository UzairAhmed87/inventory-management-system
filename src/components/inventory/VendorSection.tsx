
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, Truck, FileDown, Search } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExportUtils } from '@/utils/exportUtils';

export const VendorSection = () => {
  const { vendors, addVendor, updateVendor, deleteVendor, transactions, products } = useInventoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phoneNo: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phoneNo) return;

    if (editingVendor) {
      updateVendor(editingVendor, formData);
      setEditingVendor(null);
    } else {
      addVendor(formData);
    }

    setFormData({ name: '', phoneNo: '' });
    setShowForm(false);
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor.id);
    setFormData({
      name: vendor.name,
      phoneNo: vendor.phoneNo,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      deleteVendor(id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phoneNo: '' });
    setEditingVendor(null);
    setShowForm(false);
  };

  const getVendorTransactions = (vendorId: string) => {
    return transactions
      .filter(t => t.vendorId === vendorId && t.type === 'purchase')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const exportVendorHistory = (vendorId: string, format: 'excel' | 'pdf') => {
    const vendor = vendors.find(v => v.id === vendorId);
    const vendorTransactions = getVendorTransactions(vendorId);
    
    if (!vendor) return;

    const data: any[] = [];
    vendorTransactions.forEach(t => {
      t.items.forEach(item => {
        data.push({
          Date: new Date(t.date).toLocaleDateString(),
          Product: item.productName,
          Quantity: item.quantity,
          Price: `PKR ${item.price.toFixed(2)}`,
          'Total Price': `PKR ${item.totalPrice.toFixed(2)}`
        });
      });
    });

    if (format === 'excel') {
      ExportUtils.exportToExcel(data, `${vendor.name}_Purchase_History`);
    } else {
      ExportUtils.exportToPDF(data, `${vendor.name} - Purchase History`);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phoneNo.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Vendors</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Vendor Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNo">Phone Number</Label>
                <Input
                  id="phoneNo"
                  value={formData.phoneNo}
                  onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVendor ? 'Update' : 'Add'} Vendor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendors List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Vendor List</h3>
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">{vendor.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedVendor(vendor.id)}
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(vendor)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(vendor.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Phone: {vendor.phoneNo}</p>
                <p className="text-sm text-gray-600">
                  Purchases: {getVendorTransactions(vendor.id).length}
                </p>
                <p className={`text-sm font-medium ${(vendor.balance || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  Balance: PKR {(vendor.balance || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vendor History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Purchase History</h3>
          {selectedVendor ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {vendors.find(v => v.id === selectedVendor)?.name} - Purchase History
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportVendorHistory(selectedVendor, 'excel')}
                    >
                      <FileDown className="h-3 w-3 mr-1" />
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportVendorHistory(selectedVendor, 'pdf')}
                    >
                      <FileDown className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getVendorTransactions(selectedVendor).map((transaction) => (
                    <div key={transaction.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                        <p className="font-medium">PKR {(transaction.totalAmount || 0).toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        {transaction.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.productName} x {item.quantity}</span>
                            <span>PKR {(item.totalPrice || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {getVendorTransactions(selectedVendor).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No purchase history found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a vendor to view purchase history</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {filteredVendors.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {vendors.length === 0 
                ? "No vendors found. Add your first vendor to get started."
                : "No vendors match your search criteria."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
