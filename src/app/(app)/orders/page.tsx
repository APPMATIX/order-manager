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
    // This functionality needs to be revisited.
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

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                {userProfile?.userType === 'vendor'
                  ? 'Manage and track all your customer orders.'
                  : 'View your order history.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <OrderList orders={orders || []} userType={userProfile?.userType || 'client'} onView={handleViewOrder} onUpdateStatus={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}
