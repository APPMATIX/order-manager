
'use client';
import React, { useMemo } from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart, Loader2, ArrowLeft, Search } from 'lucide-react';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import type { Order, Client, Product, LineItem, UserProfile } from '@/lib/types';
import { useUserProfile } from '@/context/UserProfileContext';
import { OrderListSkeleton } from '@/components/orders/order-list-skeleton';
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
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { INVOICE_TYPES, ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/config';
import { Invoice } from '@/components/orders/invoice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function OrdersPage() {
  const [view, setView] = React.useState<'list' | 'form' | 'invoice'>('list');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState('All');


  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const ordersCollection = useMemoFirebase(
    () => {
      if (!user || !firestore ) return null;
      return collection(firestore, 'users', user.uid, 'orders');
    },
    [firestore, user]
  );

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersCollection);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter(order =>
        (order.customOrderId && order.customOrderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(order => statusFilter === 'All' || order.status === statusFilter)
      .filter(order => paymentStatusFilter === 'All' || order.paymentStatus === paymentStatusFilter);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter]);

  const clientsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'clients') : null),
    [firestore, user]
  );
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsCollection);

  const productsCollection = useMemoFirebase(
    () => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'products');
    },
    [firestore, user]
  );
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsCollection);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setView('form');
  };

  const handleCancelForm = () => {
    setView('list');
    setSelectedOrder(null);
  };
  
  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setView('invoice');
  };
  
  const handleUpdateStatus = (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => {
    if (!user || !firestore) return;
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { [field]: newStatus });
    toast({ title: "Order Updated", description: `The order ${field} has been changed to ${newStatus}.` });
  };

  const handleDeleteRequest = (order: Order) => {
    setOrderToDelete(order);
  };

  const confirmDelete = () => {
    if (!orderToDelete || !user) return;
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderToDelete.id);
    deleteDocumentNonBlocking(orderDocRef);
    toast({ title: "Order Deleted", description: `Order #${orderToDelete?.customOrderId || orderToDelete?.id.substring(0,6)} has been deleted.` });
    setOrderToDelete(null);
  };


  const handleFormSubmit = async (formData: {
      clientId: string; 
      lineItems: Omit<LineItem, 'total'>[];
      subTotal: number;
      vatAmount: number;
      totalAmount: number;
      invoiceType: typeof INVOICE_TYPES[number];
    }) => {
    if (!user || !firestore || !ordersCollection) return;
    
    const vendorId = user.uid;
    const clientId = formData.clientId;
    const clientName = clients?.find(c => c.id === clientId)?.name;


    if (!vendorId || !clientId || !clientName) {
        console.error("Missing vendorId, clientId, or clientName");
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create order. Critical information missing.' });
        return;
    }

    const newOrderDocRef = doc(ordersCollection);
    
    const orderData: Omit<Order, 'orderDate' | 'createdAt'> & { orderDate: any, createdAt: any } = {
        id: newOrderDocRef.id,
        customOrderId: `ORD-${Date.now().toString().slice(-6)}`,
        clientId: clientId,
        clientName: clientName,
        vendorId: vendorId,
        orderDate: serverTimestamp(),
        status: 'Pending',
        paymentStatus: 'Unpaid',
        lineItems: formData.lineItems.map(li => ({
            productId: li.productId,
            productName: li.productName,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            unit: li.unit,
            total: li.quantity * li.unitPrice
        })),
        subTotal: formData.subTotal,
        vatAmount: formData.vatAmount,
        totalAmount: formData.totalAmount,
        invoiceType: formData.invoiceType,
        createdAt: serverTimestamp(),
    };
    
    setDocumentNonBlocking(newOrderDocRef, orderData, {});

    toast({
        title: 'Order Created!',
        description: `Order #${orderData.customOrderId} has been submitted.`,
    });

    setView('list');
  };

  const isLoading = isProfileLoading || areOrdersLoading || areClientsLoading || areProductsLoading;
  
  const renderContent = () => {
    if (isLoading) {
      return <OrderListSkeleton userType={'vendor'} />;
    }

    if (view === 'form') {
      return (
        <OrderForm
          products={products || []}
          clients={clients || []}
          userProfile={userProfile as UserProfile}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
        />
      );
    }

    if (view === 'invoice') {
        if (selectedOrder && userProfile) {
            return <Invoice order={selectedOrder} vendor={userProfile} client={clients?.find(c => c.id === selectedOrder.clientId) || null} />;
        }
        return null;
    }
    
    if (filteredOrders && filteredOrders.length > 0) {
      return (
        <OrderList
          orders={filteredOrders}
          userType={'vendor'}
          onView={handleViewInvoice}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteRequest}
        />
      );
    }

    // Empty state
    return (
       <div 
        className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-[450px]"
        >
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">
          No Orders Found
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'When orders are placed, they will appear here.'}
        </p>
         <Button onClick={handleCreateOrder} size="sm" className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Create First Order
          </Button>
      </div>
    );
  };
  
  const getHeaderTitle = () => {
      switch(view) {
          case 'form':
            return 'Create Order';
          case 'invoice':
            return `Tax Invoice #${selectedOrder?.customOrderId}`;
          case 'list':
          default:
            return 'Manage Orders';
      }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
         {view === 'list' && (
           <Button onClick={handleCreateOrder} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Order
          </Button>
        )}
         {view !== 'list' && (
            <Button onClick={() => setView('list')} size="sm" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
            </Button>
         )}
      </div>
       <Card className={view === 'invoice' ? 'bg-transparent shadow-none border-none' : ''}>
        <CardHeader className={view === 'invoice' ? 'hidden' : ''}>
          <CardTitle>{getHeaderTitle()}</CardTitle>
          <CardDescription>
            {view === 'list' && 'Review and manage all incoming orders from your clients.'}
            {view === 'form' && 'Create a new order by selecting products and a client.'}
            {view === 'invoice' && 'Review the invoice details below.'}
          </CardDescription>
        </CardHeader>
        <CardContent className={view === 'invoice' ? 'p-0' : ''}>
            {view === 'list' && (
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
          { isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : renderContent() }
        </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
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
