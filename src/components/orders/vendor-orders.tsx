'use client';
import React, { useMemo, useState } from 'react';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart, ArrowLeft, Search, Printer } from 'lucide-react';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import type { Order, Client, Product, LineItem } from '@/lib/types';
import { useUserProfile } from '@/context/UserProfileContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { INVOICE_TYPES, ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/config';
import { Invoice } from '@/components/orders/invoice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderPriceForm } from './order-price-form';
import { Receipt } from './Receipt';
import { cn } from '@/lib/utils';

interface VendorOrdersProps {
    orders: Order[];
    clients: Client[];
    products: Product[];
}

export default function VendorOrders({ orders, clients, products }: VendorOrdersProps) {
  const [view, setView] = useState<'list' | 'form' | 'invoice' | 'price_form' | 'receipt'>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order =>
        (order.customOrderId && order.customOrderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(order => statusFilter === 'All' || order.status === statusFilter)
      .filter(order => paymentStatusFilter === 'All' || !order.paymentStatus || order.paymentStatus === paymentStatusFilter);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter]);

  // Derived state for the currently active order based on the ID
  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId) || null,
  [orders, selectedOrderId]);

  const orderToDelete = useMemo(() => 
    orders.find(o => o.id === orderToDeleteId) || null,
  [orders, orderToDeleteId]);

  const handleCreateOrder = () => {
    setSelectedOrderId(null);
    setView('form');
  };

  const handleCancelForm = () => {
    setView('list');
    setSelectedOrderId(null);
  };
  
  const handleViewInvoice = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('invoice');
  };
  
  const handleViewReceipt = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('receipt');
  };

  const handlePriceOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('price_form');
  };
  
  const handleUpdateStatus = (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => {
    if (!user || !firestore) return;
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { [field]: newStatus });
    toast({ title: "Order Updated", description: `The order ${field} has been changed to ${newStatus}.` });
  };

  const handleDeleteRequest = (order: Order) => {
    setOrderToDeleteId(order.id);
  };

  const confirmDelete = () => {
    if (!orderToDelete || !user) return;
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderToDelete.id);
    deleteDocumentNonBlocking(orderDocRef);
    toast({ title: "Order Deleted", description: `Order #${orderToDelete?.customOrderId || orderToDelete?.id.substring(0,6)} has been deleted.` });
    setOrderToDeleteId(null);
  };

  const handlePriceFormSubmit = (data: {
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    invoiceType: typeof INVOICE_TYPES[number];
  }) => {
      if (!selectedOrder || !user) return;
      const orderDocRef = doc(firestore, 'users', user.uid, 'orders', selectedOrder.id);
      updateDocumentNonBlocking(orderDocRef, {
          ...data,
          status: 'Priced',
          paymentStatus: 'Unpaid'
      });
      toast({ title: 'Order Priced', description: `Order for ${selectedOrder.clientName} has been updated.` });
      setView('list');
      setSelectedOrderId(null);
  };

  const handleOrderSubmit = (data: {
    clientId: string;
    lineItems: Omit<LineItem, 'total'>[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    invoiceType: typeof INVOICE_TYPES[number];
    paymentMethod: typeof PAYMENT_METHODS[number];
  }) => {
    if (!user || !clients) return;

    const client = clients.find(c => c.id === data.clientId);
    if (!client) return;
    
    const ordersCollection = collection(firestore, 'users', user.uid, 'orders');
    const newOrderRef = doc(ordersCollection);
    
    const highestNumericId = orders.reduce((max, o) => {
      const idNumber = parseInt(o.customOrderId?.split('-')[1] || '0', 10);
      return idNumber > max ? idNumber : max;
    }, 0);
    const newId = (highestNumericId + 1).toString().padStart(4, '0');
    
    const prefix = userProfile?.invoicePrefix || 'INV-';
    const customOrderId = `${prefix}${newId}`;


    const newOrder: Omit<Order, 'id'> = {
      ...data,
      customOrderId,
      vendorId: user.uid,
      clientName: client.name,
      orderDate: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      status: 'Priced',
      paymentStatus: 'Unpaid',
    };

    addDocumentNonBlocking(ordersCollection, newOrder);
    
    toast({ title: "Order Created", description: `New order for ${client.name} has been created.` });
    setView('list');
  };

  const renderContent = () => {
    const clientUser = clients.find(c => c.id === selectedOrder?.clientId);

    switch(view) {
      case 'form':
        return (
          <OrderForm
            products={products || []}
            clients={clients || []}
            userProfile={userProfile}
            onSubmit={handleOrderSubmit}
            onCancel={handleCancelForm}
          />
        );
      case 'invoice':
        if (selectedOrder && userProfile) {
            return <Invoice order={selectedOrder} vendor={userProfile} client={clientUser || null} />;
        }
        return null;
      case 'receipt':
        if (selectedOrder && userProfile) {
            return <Receipt order={selectedOrder} vendor={userProfile} client={clientUser || null} />;
        }
        return null;
      case 'price_form':
        if (selectedOrder) {
            return (
              <OrderPriceForm 
                order={selectedOrder} 
                products={products} // Pass products list for catalog lookups
                onSubmit={handlePriceFormSubmit} 
                onCancel={handleCancelForm} 
              />
            );
        }
        return null;
      case 'list':
      default:
        if (filteredOrders.length > 0) {
          return (
            <OrderList
              orders={filteredOrders}
              userType={'vendor'}
              onView={handleViewInvoice}
              onReceipt={handleViewReceipt}
              onPrice={handlePriceOrder}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDeleteRequest}
            />
          );
        }
        return (
           <div 
            className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-[450px]"
            >
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              No Orders Found
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'When clients place orders, they will appear here.'}
            </p>
          </div>
        );
    }
  };
  
  const getHeaderTitle = () => {
      switch(view) {
          case 'form':
            return 'Create Order (for legacy client)';
          case 'invoice':
            return `Tax Invoice #${selectedOrder?.customOrderId || selectedOrder?.id.substring(0, 8)}`;
          case 'receipt':
            return `Receipt #${selectedOrder?.customOrderId || selectedOrder?.id.substring(0, 8)}`;
          case 'price_form':
              return `Price Order #${selectedOrder?.customOrderId || selectedOrder?.id.substring(0, 8)}`;
          case 'list':
          default:
            return 'Manage Orders';
      }
  }

  return (
    <>
      <div className={cn("flex items-center justify-between", view !== 'list' && "no-print")}>
        <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
         {view === 'list' && (
           <Button onClick={handleCreateOrder} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Legacy Order
          </Button>
        )}
         {view !== 'list' && (
            <Button onClick={() => setView('list')} size="sm" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
            </Button>
         )}
      </div>
       <Card className={(view === 'invoice' || view === 'receipt') ? 'bg-transparent shadow-none border-none' : ''}>
        <CardHeader className={cn((view === 'invoice' || view === 'receipt') ? 'hidden' : '', view !== 'list' && "no-print")}>
          <CardTitle>{getHeaderTitle()}</CardTitle>
          <CardDescription>
            {view === 'list' && 'Review client orders. Price new orders or manage existing ones.'}
            {view === 'form' && 'Create a new order for a client not using the portal.'}
            {view === 'invoice' && 'Review the invoice details below.'}
            {view === 'price_form' && 'Set prices for this client order.'}
          </CardDescription>
        </CardHeader>
        <CardContent className={(view === 'invoice' || view === 'receipt') ? 'p-0' : ''}>
            {view === 'list' && (
                <div className="flex flex-col sm:flex-row gap-4 mb-4 no-print">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by Order ID or Client Name..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            {ORDER_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by payment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Payments</SelectItem>
                            {PAYMENT_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the order
              <span className="font-bold"> #${orderToDelete?.customOrderId || orderToDelete?.id.substring(0,6)}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
