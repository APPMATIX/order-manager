'use client';
import React from 'react';
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
import { PlusCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import type { Order, Client, Product, LineItem } from '@/lib/types';
import { useUserProfile } from '@/hooks/useUserProfile';
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
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function OrdersPage() {
  const [view, setView] = React.useState<'list' | 'form' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const ordersCollection = useMemoFirebase(
    () => {
      if (!user || !firestore || !userProfile) return null;
      // Both vendors and clients query the same path, but rules secure it.
      const targetUid = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
      if (!targetUid) return null;
      return collection(firestore, 'users', targetUid, 'orders');
    },
    [firestore, user, userProfile]
  );

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersCollection);

  const clientsCollection = useMemoFirebase(
    () => (user && userProfile?.userType === 'vendor' ? collection(firestore, 'users', user.uid, 'clients') : null),
    [firestore, user, userProfile]
  );
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsCollection);

  const productsCollection = useMemoFirebase(
    () => {
        if (!user || !firestore || !userProfile) return null;
        const targetUid = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
        if (!targetUid) return null;
        return collection(firestore, 'users', targetUid, 'products');
    },
    [firestore, user, userProfile]
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
  
  const handleViewOrder = (order: Order) => {
    // For now, details view is not implemented, just log or use list view
    console.log("Viewing order:", order);
    // In a full app, you might set a selected order and switch to a 'details' view
    // setSelectedOrder(order);
    // setView('details');
  };
  
  const handleUpdateStatus = (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => {
    if (!user || !firestore || !userProfile) return;
     const targetUid = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
     if(!targetUid) return;
    const orderDocRef = doc(firestore, 'users', targetUid, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { [field]: newStatus });
    toast({ title: "Order Updated", description: `The order ${field} has been changed to ${newStatus}.` });
  };

  const handleDeleteRequest = (order: Order) => {
    setOrderToDelete(order);
  };

  const confirmDelete = () => {
    if (!orderToDelete || !user || !userProfile) return;
    const targetUid = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
    if(!targetUid) return;
    const orderDocRef = doc(firestore, 'users', targetUid, 'orders', orderToDelete.id);
    deleteDocumentNonBlocking(orderDocRef);
    toast({ title: "Order Deleted", description: `Order #${orderToDelete.customOrderId || orderToDelete.id.substring(0,6)} has been deleted.` });
    setOrderToDelete(null);
  };


  const handleFormSubmit = async (formData: {
      clientId?: string;
      lineItems: Omit<LineItem, 'total'>[],
      totalAmount: number;
    }) => {
    if (!user || !firestore || !userProfile || !ordersCollection) return;
    
    // Determine the vendor's UID and the client's ID
    const vendorId = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
    const clientId = userProfile.userType === 'client' ? user.uid : formData.clientId;
    const clientName = userProfile.userType === 'client' 
      ? user.email // Or a display name if available
      : clients?.find(c => c.id === clientId)?.name;


    if (!vendorId || !clientId || !clientName) {
        console.error("Missing vendorId, clientId, or clientName");
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create order. Critical information missing.' });
        return;
    }

    const newOrderDocRef = doc(ordersCollection);
    
    const orderData: Order = {
        id: newOrderDocRef.id,
        customOrderId: `ORD-${Date.now().toString().slice(-6)}`,
        clientId: clientId,
        clientName: clientName,
        vendorId: vendorId,
        orderDate: serverTimestamp() as any,
        status: 'Pending',
        paymentStatus: 'Unpaid',
        lineItems: formData.lineItems.map(li => ({...li, total: li.quantity * li.unitPrice})),
        totalAmount: formData.totalAmount,
        createdAt: serverTimestamp() as any,
    };
    
    // Use setDoc with the new ref to ensure the ID is set correctly
    updateDocumentNonBlocking(newOrderDocRef, orderData);

    toast({
        title: 'Order Created!',
        description: `Order #${orderData.customOrderId} has been submitted.`,
    });

    setView('list');
  };

  const isLoading = isProfileLoading || areOrdersLoading || areClientsLoading || areProductsLoading;
  
  const canCreateOrder = userProfile && (userProfile.userType === 'vendor' || (userProfile.userType === 'client' && userProfile.vendorId));

  const renderContent = () => {
    if (isLoading) {
      return <OrderListSkeleton userType={'vendor'} />;
    }

    if (view === 'form') {
      return (
        <OrderForm
          products={products || []}
          clients={clients || []}
          userProfile={userProfile}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
        />
      );
    }
    
    if (orders && orders.length > 0) {
      return (
        <OrderList
          orders={orders}
          userType={'vendor'}
          onView={handleViewOrder}
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
          When orders are placed, they will appear here.
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
         {view === 'list' && canCreateOrder && (
          <Button onClick={handleCreateOrder} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Order
          </Button>
        )}
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Manage Orders</CardTitle>
          <CardDescription>
            Review and manage all incoming orders from your clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
