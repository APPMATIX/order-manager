
'use client';
import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import { Loader2 } from 'lucide-react';
import VendorOrders from '@/components/orders/vendor-orders';
import ClientOrders from '@/components/orders/client-orders';
import AdminOrders from '@/components/orders/admin-orders';
import type { Vendor } from '@/lib/types';


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
        if (userProfile.userType === 'admin') {
            return collection(firestore, 'orders');
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
          if (!vendorId) return null; // Client might not have a vendorId yet if new
          return collection(firestore, 'users', vendorId, 'products');
      },
      [firestore, user, userProfile]
    );
    const { data: products, isLoading: areProductsLoading } = useCollection(productsCollection);

    const vendorIdForClient = userProfile?.userType === 'client' ? userProfile.vendorId : undefined;
    const vendorProfileQuery = useMemoFirebase(() => {
        if (!firestore || !vendorIdForClient) return null;
        return doc(firestore, 'users', vendorIdForClient);
    }, [firestore, vendorIdForClient]);
    const { data: vendorProfile, isLoading: isVendorProfileLoading } = useCollection(vendorProfileQuery);

    const vendorsQuery = useMemoFirebase(() => {
        if (userProfile?.userType !== 'admin') return null;
        return collection(firestore, 'vendors');
    }, [firestore, userProfile]);
    const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);


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
        return <ClientOrders orders={orders || []} products={products || []} vendor={vendorProfile?.[0]} />;
    }

    if (userProfile.userType === 'admin') {
        return <AdminOrders allOrders={orders || []} allVendors={vendors || []} />;
    }

    return <div>Access Denied. You do not have the required role to view this page.</div>;
}
