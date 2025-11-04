
'use client';
import React, { useState } from 'react';
import type { Order, Product, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { OrderList } from './order-list';
import { Invoice } from './invoice';

interface ClientOrdersProps {
  orders: Order[];
  products: Product[];
  vendor: UserProfile | undefined;
}

export default function ClientOrders({ orders, products, vendor }: ClientOrdersProps) {
  const [view, setView] = useState<'list' | 'invoice'>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setView('invoice');
  };

  const renderContent = () => {
    if (view === 'invoice' && selectedOrder) {
      return (
        <>
          <Button onClick={() => setView('list')} variant="outline" className="mb-4">
            Back to Orders
          </Button>
          <Invoice order={selectedOrder} vendor={vendor!} client={null} />
        </>
      );
    }
    
    if (orders.length > 0) {
      return (
        <OrderList
          orders={orders}
          userType="client"
          onView={handleViewInvoice}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-[450px]">
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Orders Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">When you place orders, they will appear here.</p>
        <Button onClick={() => (window.location.href = '/dashboard')} size="sm" className="mt-4">
          Place First Order
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">Your Orders</h1>
      </div>
      <Card className={view === 'invoice' ? 'bg-transparent shadow-none border-none' : ''}>
        {view === 'list' && (
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>Review and track your orders.</CardDescription>
          </CardHeader>
        )}
        <CardContent className={view === 'invoice' ? 'p-0' : ''}>
          {renderContent()}
        </CardContent>
      </Card>
    </>
  );
}
