
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
import { PlusCircle, ShoppingCart } from 'lucide-react';
import { useUserProfile } from '@/context/UserProfileContext';
import type { Order, Product, LineItem } from '@/lib/types';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { toast } from '@/hooks/use-toast';
import { OrderListSkeleton } from '@/components/orders/order-list-skeleton';

export default function OrdersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const ordersCollection = useMemoFirebase(() => {
    if (!user || !firestore || !userProfile) return null;

    // Both vendors and clients read from their own user-specific orders subcollection
    return collection(firestore, 'users', user.uid, 'orders');

  }, [firestore, user, userProfile]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersCollection);

  const vendorProductsPath = useMemoFirebase(
    () => (userProfile?.userType === 'client' && userProfile.vendorId ? collection(firestore, 'users', userProfile.vendorId, 'products') : null),
    [firestore, userProfile]
  );
  const { data: vendorProducts, isLoading: areProductsLoading } = useCollection<Product>(vendorProductsPath);

  const handleCreateOrder = () => {
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

        // This creates a reference in the VENDOR's order collection
        const vendorOrderRef = doc(collection(firestore, 'users', userProfile.vendorId, 'orders'));
        const customOrderId = vendorOrderRef.id.substring(0, 6).toUpperCase();

        const newOrderData: Order = {
          id: vendorOrderRef.id,
          clientId: user.uid,
          clientName: userProfile.email || user.email || 'Unknown Client',
          orderDate: serverTimestamp() as any,
          status: 'Pending' as const,
          paymentStatus: 'Unpaid' as const,
          lineItems: formData.lineItems,
          totalAmount: formData.totalAmount,
          vendorId: userProfile.vendorId,
          customOrderId,
          createdAt: serverTimestamp() as any,
        };

        // 1. Set the order in the vendor's collection
        batch.set(vendorOrderRef, newOrderData);

        // 2. Set a copy of the order in the CLIENT's collection
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

  const isLoading = isProfileLoading || areOrdersLoading || (userProfile?.userType === 'client' && areProductsLoading);
  const canCreateOrder = userProfile?.userType === 'client' && !!userProfile.vendorId;

  const renderContent = () => {
    if (isLoading) {
      return <OrderListSkeleton userType={userProfile?.userType || 'client'} />;
    }

    if (orders && orders.length > 0) {
      return (
        <OrderList
          orders={orders}
          userType={userProfile?.userType || 'client'}
          onView={handleViewOrder}
          onUpdateStatus={handleUpdateStatus}
        />
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Orders Yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {userProfile?.userType === 'vendor'
            ? "Your clients' orders will appear here."
            : 'Click "Create Order" to get started.'}
        </p>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
       {isFormOpen && canCreateOrder ? (
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
                  {renderContent()}
                </CardContent>
            </Card>
       )}
    </div>
  );
}
