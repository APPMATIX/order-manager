'use client';
import React, { useState } from 'react';
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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
import type { Order, Product, Client } from '@/lib/types';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Timestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export default function OrdersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  // For Vendors: Fetch all orders under their user ID.
  const vendorOrdersCollection = useMemoFirebase(
    () => (user && userProfile?.userType === 'vendor' ? collection(firestore, 'users', user.uid, 'orders') : null),
    [firestore, user, userProfile]
  );
  const { data: vendorOrders, isLoading: areVendorOrdersLoading } = useCollection<Order>(vendorOrdersCollection);
  
  // For Clients: Fetch their specific orders from their OWN subcollection.
  const clientOrdersCollection = useMemoFirebase(
    () => (user && userProfile?.userType === 'client' ? collection(firestore, 'users', user.uid, 'orders') : null),
    [firestore, user, userProfile]
  );
  const { data: clientOrders, isLoading: areClientOrdersLoading } = useCollection<Order>(clientOrdersCollection);
  
  // For Clients: Fetch the vendor's products to create an order.
  const productsCollection = useMemoFirebase(
    () => (userProfile?.userType === 'client' && user ? collection(firestore, 'users', 'DEMO_VENDOR_UID', 'products') : null),
    [firestore, user, userProfile]
  );
  const { data: products } = useCollection<Product>(productsCollection);

  // For Clients: Fetch their own client data to pass to the order.
   const clientDataRef = useMemoFirebase(() => {
      if(userProfile?.userType === 'client' && user) {
          return doc(firestore, 'users', 'DEMO_VENDOR_UID', 'clients', user.uid)
      }
      return null;
  }, [firestore, user, userProfile]);
  const {data: clientData} = useDoc<Client>(clientDataRef);


  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setIsFormOpen(true);
  };

  const handleViewOrder = (order: Order) => {
    // For now, just log to console. Could open a detail view.
    console.log('Viewing order:', order);
  };
  
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedOrder(null);
  };

  const handleFormSubmit = async (orderData: Omit<Order, 'id' | 'createdAt' | 'customOrderId'>) => {
    if (!user || !firestore) return;
    
    // This is where the client submits the order. 
    // We'll use a batch write to save the order to both the vendor's and the client's subcollection.
    // This ensures data is where it needs to be for security rules to work.
    
    const newOrder: Omit<Order, 'id'> = {
        ...orderData,
        customOrderId: `ORDER-${Date.now()}`,
        createdAt: Timestamp.now(),
    };

    try {
        const batch = writeBatch(firestore);

        // 1. Create a document in the VENDOR's orders subcollection
        const vendorOrderRef = doc(collection(firestore, 'users', 'DEMO_VENDOR_UID', 'orders'));
        batch.set(vendorOrderRef, newOrder);

        // 2. Create a copy of the document in the CLIENT's orders subcollection
        const clientOrderRef = doc(collection(firestore, 'users', user.uid, 'orders'));
        batch.set(clientOrderRef, newOrder);

        await batch.commit();

        toast({
            title: "Order Submitted!",
            description: "Your order has been placed successfully.",
        });

    } catch (error) {
        console.error("Error submitting order:", error);
         toast({
            variant: "destructive",
            title: "Order Failed",
            description: "There was a problem submitting your order.",
        });
    }

    handleFormClose();
  };


  const isLoading = isProfileLoading || areVendorOrdersLoading || areClientOrdersLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orders = userProfile?.userType === 'vendor' ? vendorOrders : clientOrders;
  const canCreateOrder = userProfile?.userType === 'client' && clientData;


  return (
    <div className="container mx-auto p-4">
       {isFormOpen && userProfile?.userType === 'client' && clientData ? (
        <OrderForm
          products={products || []}
          client={clientData}
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
                    : 'View your order history and place new orders.'}
                </CardDescription>
              </div>
              {canCreateOrder && (
                <Button onClick={handleCreateOrder}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Order
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
             <OrderList orders={orders || []} userType={userProfile?.userType || 'client'} onView={handleViewOrder} onUpdateStatus={() => {}} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
