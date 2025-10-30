'use client';
import React, { useState } from 'react';
import { collection, doc, query, where } from 'firebase/firestore';
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

  // For Clients: Fetch their specific orders from a known vendor.
  // This requires a composite index in Firestore on the 'orders' collection for the 'clientId' field.
  const clientOrdersQuery = useMemoFirebase(
    () => {
      if (user && userProfile?.userType === 'client') {
        // Query orders from the demo vendor where the clientId matches the current user's UID.
        return query(
          collection(firestore, 'users', 'DEMO_VENDOR_UID', 'orders'), 
          where('clientId', '==', user.uid)
        );
      }
      return null;
    },
    [firestore, user, userProfile]
  );
  const { data: clientOrders, isLoading: areClientOrdersLoading } = useCollection<Order>(clientOrdersQuery);
  
  // For Clients: Fetch the vendor's products to create an order.
  // This assumes a client orders from a single vendor.
  const productsCollection = useMemoFirebase(
    () => (userProfile?.userType === 'client' && user ? collection(firestore, 'users', 'DEMO_VENDOR_UID', 'products') : null),
    [firestore, user, userProfile]
  );
  const { data: products } = useCollection<Product>(productsCollection);

  // For Clients: Fetch their own client data to pass to the order.
  // This assumes the client's document ID in the vendor's `clients` subcollection is the same as the client's user UID.
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

  const handleFormSubmit = (orderData: Omit<Order, 'id' | 'createdAt' | 'customOrderId'>) => {
    if (!user) return;
    
    // This is where the client submits the order. It should be written to the VENDOR's subcollection.
    const vendorOrdersRef = collection(firestore, 'users', 'DEMO_VENDOR_UID', 'orders');
    
    const newOrder: Omit<Order, 'id'> = {
        ...orderData,
        customOrderId: `ORDER-${Date.now()}`,
        createdAt: Timestamp.now(),
    };

    addDocumentNonBlocking(vendorOrdersRef, newOrder);
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
