
'use client';
import React, { useState } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Order, Product, LineItem } from '@/lib/types';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { toast } from '@/hooks/use-toast';

export default function OrdersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const ordersCollectionPath = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'orders') : null),
    [firestore, user]
  );
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersCollectionPath);

  const vendorProductsPath = useMemoFirebase(
    () => (userProfile?.userType === 'client' && userProfile.vendorId ? collection(firestore, 'users', userProfile.vendorId, 'products') : null),
    [firestore, userProfile]
  );
  const { data: vendorProducts, isLoading: areProductsLoading } = useCollection<Product>(vendorProductsPath);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setIsFormOpen(true);
  };

  const handleViewOrder = (order: Order) => {
    console.log('Viewing order:', order);
    toast({
        title: "Order Details",
        description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(order, null, 2)}</code></pre>
    })
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedOrder(null);
  };

  const handleUpdateStatus = (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => {
    if (!user || userProfile?.userType !== 'vendor') return;
    
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { [field]: newStatus });

    toast({
        title: `Order Updated`,
        description: `Order ${orderId.substring(0,6)} has been marked as ${newStatus}.`,
    })
  };

  const handleFormSubmit = async (formData: { lineItems: LineItem[], totalAmount: number }) => {
    if (!firestore || !user || !userProfile?.vendorId) return;

    try {
        const batch = writeBatch(firestore);

        const vendorOrderRef = doc(collection(firestore, 'users', userProfile.vendorId, 'orders'));
        const customOrderId = vendorOrderRef.id.substring(0, 6).toUpperCase();

        const newOrderData = {
          clientId: user.uid,
          clientName: userProfile.email || user.email || 'Unknown Client',
          orderDate: serverTimestamp(),
          status: 'Pending' as const,
          paymentStatus: 'Unpaid' as const,
          lineItems: formData.lineItems,
          totalAmount: formData.totalAmount,
          vendorId: userProfile.vendorId,
          customOrderId,
          createdAt: serverTimestamp(),
        };

        batch.set(vendorOrderRef, newOrderData);

        const clientOrderRef = doc(firestore, 'users', user.uid, 'orders', vendorOrderRef.id);
        batch.set(clientOrderRef, newOrderData);

        await batch.commit();

        toast({
            title: 'Order Submitted!',
            description: `Your order #${customOrderId} has been placed.`,
        });

        handleFormClose();
    } catch (error) {
        console.error("Error submitting order:", error);
        toast({
            variant: "destructive",
            title: "Order Failed",
            description: "There was a problem submitting your order. Please try again.",
        });
    }
  };

  const isLoading = isProfileLoading || areOrdersLoading || areProductsLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canCreateOrder = userProfile?.userType === 'client' && !!userProfile.vendorId;

  return (
    <div className="container mx-auto p-4">
       {isFormOpen && userProfile?.userType === 'client' ? (
            <OrderForm 
                products={vendorProducts || []}
                userProfile={userProfile}
                onSubmit={handleFormSubmit}
                onCancel={handleFormClose}
            />
       ) : (
            <Card>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                    <CardTitle>Orders</CardTitle>
                    <CardDescription>
                        {userProfile?.userType === 'vendor'
                        ? 'Manage and track all your customer orders.'
                        : 'View your order history and create new orders.'}
                    </CardDescription>
                    </div>
                    {canCreateOrder && (
                        <Button onClick={handleCreateOrder}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Order
                        </Button>
                    )}
                </div>
                </CardHeader>
                <CardContent>
                <OrderList 
                    orders={orders || []} 
                    userType={userProfile?.userType || 'client'} 
                    onView={handleViewOrder} 
                    onUpdateStatus={handleUpdateStatus} 
                />
                </CardContent>
            </Card>
       )}
    </div>
  );
}
