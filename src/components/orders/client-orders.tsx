
'use client';
import React, { useState, useMemo } from 'react';
import type { Order, Product, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Search, Filter, ShoppingBag, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { OrderList } from './order-list';
import { Invoice } from './invoice';
import { useUserProfile } from '@/context/UserProfileContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCountry } from '@/context/CountryContext';

interface ClientOrdersProps {
  orders: Order[];
  products: Product[];
  vendor: UserProfile | undefined;
}

export default function ClientOrders({ orders, products, vendor }: ClientOrdersProps) {
  const [view, setView] = useState<'list' | 'invoice'>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const { userProfile } = useUserProfile();
  const { formatCurrency } = useCountry();

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order =>
        (order.customOrderId && order.customOrderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(order => statusFilter === 'All' || order.status === statusFilter);
  }, [orders, searchTerm, statusFilter]);

  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId) || null,
  [orders, selectedOrderId]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => ['Awaiting Pricing', 'Pending', 'In Transit'].includes(o.status)).length;
    const totalSpent = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    
    return { totalOrders, activeOrders, totalSpent };
  }, [orders]);

  const handleViewInvoice = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('invoice');
  };

  if (view === 'invoice' && selectedOrder) {
    return (
      <div className="space-y-4">
        <Button onClick={() => setView('list')} variant="outline" className="mb-4 no-print flex items-center gap-2">
          <Filter className="h-4 w-4 rotate-180" />
          Back to Order List
        </Button>
        <Invoice order={selectedOrder} vendor={vendor!} client={userProfile} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Your Purchase History</h1>
            <p className="text-sm text-muted-foreground">Track and manage your orders from {vendor?.companyName}.</p>
          </div>
        </div>

        {/* Client KPI Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="border-primary/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lifetime Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.totalOrders}</div>
              <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Total transactions</p>
            </CardContent>
          </Card>
          <Card className="border-primary/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Orders in Pipeline</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.activeOrders}</div>
              <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Awaiting delivery/pricing</p>
            </CardContent>
          </Card>
          <Card className="border-primary/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{formatCurrency(stats.totalSpent)}</div>
              <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Aggregated gross value</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Invoice ID..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Awaiting Pricing">Awaiting Pricing</SelectItem>
                  <SelectItem value="Priced">Priced</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-primary/5">
        <CardHeader className="bg-muted/10 no-print">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Order Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredOrders.length > 0 ? (
            <OrderList
              orders={filteredOrders}
              userType="client"
              onView={handleViewInvoice}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Matching Orders</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm || statusFilter !== 'All' 
                  ? "Try adjusting your search or filters." 
                  : "You haven't placed any orders yet."}
              </p>
              {!searchTerm && statusFilter === 'All' && (
                <Button onClick={() => (window.location.href = '/dashboard')} className="font-bold">
                  Browse Catalog & Place Order
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
