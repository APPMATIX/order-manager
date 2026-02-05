
'use client';
import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import { Loader2 } from 'lucide-react';
import VendorOrders from '@/components/orders/vendor-orders';
import ClientOrders from '@/components/orders/client-orders';
import AdminOrders from '@/components/orders/admin-orders';
import type { Order, UserProfile as TUserProfile } from '@/lib/types';


export default function OrdersPage() {
    const { user } = useUser();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();

    // Query for orders based on user role
    const ordersQuery = useMemoFirebase(() => {
        if (!user || !userProfile) return null;
        
        if (userProfile.userType === 'vendor') {
            return collection(firestore, 'users', user.uid, 'orders');
        }
        if (userProfile.userType === 'client' && userProfile.vendorId) {
            return query(collection(firestore, 'users', userProfile.vendorId, 'orders'), where('clientId', '==', user.uid));
        }
        return null;
    }, [firestore, user?.uid, userProfile?.userType, userProfile?.vendorId]);
    
    const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);
    
    // For Admin: Fetch all users of type 'vendor' to allow filtering orders
    const vendorsQuery = useMemoFirebase(() => {
        if (!userProfile || userProfile.userType !== 'admin') return null;
        return query(collection(firestore, 'users'), where('userType', '==', 'vendor'));
    }, [firestore, userProfile?.userType]);
    const { data: vendors, isLoading: areVendorsLoading } = useCollection<TUserProfile>(vendorsQuery);


    // For Vendor: fetch clients and products for the order creation form
    const clientsCollection = useMemoFirebase(
      () => (user && userProfile?.userType === 'vendor' ? collection(firestore, 'users', user.uid, 'clients') : null),
      [firestore, user?.uid, userProfile?.userType]
    );
    const { data: clients, isLoading: areClientsLoading } = useCollection(clientsCollection);

    // For Client or Vendor: fetch products
    const productsCollection = useMemoFirebase(
      () => {
          if (!user || !firestore || !userProfile) return null;
          const vendorId = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
          if (!vendorId) return null; 
          return collection(firestore, 'users', vendorId, 'products');
      },
      [firestore, user?.uid, userProfile?.userType, userProfile?.vendorId]
    );
    const { data: products, isLoading: areProductsLoading } = useCollection(productsCollection);

    // For Client: fetch their assigned vendor's profile
    const vendorProfileQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.vendorId) return null;
        return doc(firestore, 'users', userProfile.vendorId);
    }, [firestore, userProfile?.vendorId]);
    const { data: vendorProfile, isLoading: isVendorProfileLoading } = useDoc(vendorProfileQuery);


    const isLoading = isProfileLoading || areOrdersLoading || areClientsLoading || areProductsLoading || isVendorProfileLoading || areVendorsLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!userProfile) {
        return <div>No user profile found.</div>;
    }

    if (userProfile.userType === 'vendor') {
        return <VendorOrders orders={orders || []} clients={clients || []} products={products || []} />;
    }

    if (userProfile.userType === 'client') {
        return <ClientOrders orders={orders || []} products={products || []} vendor={vendorProfile || undefined} />;
    }

    if (userProfile.userType === 'admin') {
        return <AdminOrders vendors={vendors || []} />;
    }

    return <div>Access Denied. You do not have the required role to view this page.</div>;
}
