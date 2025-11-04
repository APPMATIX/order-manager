
'use client';
import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import { Loader2 } from 'lucide-react';
import VendorOrders from '@/components/orders/vendor-orders';
import ClientOrders from '@/components/orders/client-orders';

export default function OrdersPage() {
    const { user } = useUser();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!user || !userProfile) return null;
        if (userProfile.userType === 'vendor') {
            return query(collection(firestore, 'orders'), where('vendorId', '==', user.uid));
        }
        if (userProfile.userType === 'client') {
            return query(collection(firestore, 'orders'), where('clientId', '==', user.uid));
        }
        return null;
    }, [firestore, user, userProfile]);

    const { data: orders, isLoading: areOrdersLoading } = useCollection(ordersQuery);
    
    const clientsCollection = useMemoFirebase(
      () => (user && userProfile?.userType === 'vendor' ? collection(firestore, 'users', user.uid, 'clients') : null),
      [firestore, user, userProfile]
    );
    const { data: clients, isLoading: areClientsLoading } = useCollection(clientsCollection);

    const productsCollection = useMemoFirebase(
      () => {
          if (!user || !firestore || !userProfile) return null;
          const vendorId = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
          if (!vendorId) return null;
          return collection(firestore, 'users', vendorId, 'products');
      },
      [firestore, user, userProfile]
    );
    const { data: products, isLoading: areProductsLoading } = useCollection(productsCollection);

    const vendorIdForClient = userProfile?.userType === 'client' ? userProfile.vendorId : undefined;
    const vendorProfileQuery = useMemoFirebase(() => {
        if (!firestore || !vendorIdForClient) return null;
        return collection(firestore, 'users', where('id', '==', vendorIdForClient));
    }, [firestore, vendorIdForClient]);
    const { data: vendorProfile, isLoading: isVendorProfileLoading } = useCollection(vendorProfileQuery);

    const isLoading = isProfileLoading || areOrdersLoading || areClientsLoading || areProductsLoading || isVendorProfileLoading;

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
        return <ClientOrders orders={orders || []} products={products || []} vendor={vendorProfile?.[0]} />;
    }

    return <div>Access Denied.</div>;
}
