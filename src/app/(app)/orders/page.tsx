'use client';
import React, { useState } from 'react';
import { collection, collectionGroup, doc, query, where } from 'firebase/firestore';
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

  // For Clients: Fetch their specific orders. This requires knowing the vendor's UID.
  // This is a simplified approach. A real-world scenario might involve a `client` subcollection on the vendor
  // or a top-level `orders` collection with robust security rules.
  // For this MVP, we assume a client is linked to a single, hardcoded vendor for demonstration.
  // In a real app, you would dynamically determine the vendor UID.
  const clientOrdersQuery = useMemoFirebase(
    () => {
      if (user && userProfile?.userType === 'client') {
        // This is a simplification. We'd need a way to know which vendors the client can order from.
        // For now, we query all orders where clientId matches the current user.
        // This requires a collection group query and appropriate indexes in firestore.
        return query(collectionGroup(firestore, 'orders'), where('clientId', '==', user.uid));
      }
      return null;
    },
    [firestore, user, userProfile]
  );
  const { data: clientOrders, isLoading: areClientOrdersLoading } = useCollection<Order>(clientOrdersQuery);
  
  // For Clients: Fetch the vendor's products to create an order.
  // This assumes a client orders from a single vendor.
  // A more complex app would need to determine the correct vendor.
  const productsCollection = useMemoFirebase(
    () => (userProfile?.userType === 'client' && user ? collection(firestore, 'users', 'DEMO_VENDOR_UID', 'products') : null),
    [firestore, user, userProfile]
  );
  const { data: products } = useCollection<Product>(productsCollection);

  // For Clients: Fetch their own client data to pass to the order.
  const clientDataRef = useMemoFirebase(() => {
      if(userProfile?.userType === 'client' && user) {
          // This path needs to be adjusted based on where client data is actually stored.
          // Assuming it's under a vendor. This is a big assumption.
          return doc(firestore, 'users', 'DEMO_VENDOR_UID', 'clients', user.uid)
      }
      return null;
  }, [firestore, user, userProfile]);
  // const {data: clientData} = useDoc<Client>(clientDataRef);


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
  const canCreateOrder = userProfile?.userType === 'client';


  return (
    <div className="container mx-auto p-4">
       {isFormOpen && userProfile?.userType === 'client' ? (
        <OrderForm
          products={products || []}
          // This is a mock. In a real app, clientData would be fetched.
          client={{id: user!.uid, name: user!.email!} as Client}
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
