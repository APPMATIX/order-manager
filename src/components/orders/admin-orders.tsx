
'use client';
import React, { useMemo, useState } from 'react';
import type { Order, Vendor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderList } from './order-list';
import { Invoice } from './invoice'; // Assuming admins can view invoices

interface AdminOrdersProps {
  allOrders: Order[];
  allVendors: Vendor[];
}

export default function AdminOrders({ allOrders, allVendors }: AdminOrdersProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [view, setView] = useState<'list' | 'invoice'>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    if (selectedVendorId === 'all') {
      return allOrders;
    }
    return allOrders.filter(order => order.vendorId === selectedVendorId);
  }, [allOrders, selectedVendorId]);

  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setView('invoice');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedOrder(null);
  }

  if (view === 'invoice' && selectedOrder) {
    return (
        <div className="space-y-4">
            <Button onClick={handleBackToList} variant="outline">Back to All Orders</Button>
            <Invoice order={selectedOrder} vendor={{} as any} client={null} />
             {/* Note: Vendor and Client details would need to be fetched for the invoice */}
        </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>View and filter all orders across the platform.</CardDescription>
            </div>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Filter by vendor..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {allVendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrders.length > 0 ? (
          <OrderList orders={filteredOrders} userType="admin" onView={handleViewInvoice} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No orders found for the selected vendor.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
