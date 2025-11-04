
'use client';
import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import { Loader2 } from 'lucide-react';
import VendorOrders from '@/components/orders/vendor-orders';
import ClientOrders from '@/components/orders/client-orders';
import AdminOrders from '@/components/orders/admin-orders';
import type { Vendor, Order } from '@/lib/types';


export default function OrdersPage() {
    const { user } = useUser();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!user || !userProfile) return null;
        const vendorIdForClient = userProfile.userType === 'client' ? userProfile.vendorId : user.uid;

        if (userProfile.userType === 'vendor') {
            return collection(firestore, 'users', user.uid, 'orders');
        }
        if (userProfile.userType === 'client' && vendorIdForClient) {
            return query(collection(firestore, 'users', vendorIdForClient, 'orders'), where('clientId', '==', user.uid));
        }
        if (userProfile.userType === 'admin') {
            // Admin queries would be more complex, likely done server-side or via a dedicated function.
            // For this client-side example, we'll assume an admin can't see orders this way.
             return collection(firestore, 'users'); // This will be empty for list, but shows intent
        }
        return null;
    }, [firestore, user, userProfile]);
    
    // For admin, we need a different approach. Let's fetch all users, then all orders for each user.
    // This is inefficient and not for production but demonstrates the concept for an admin view.
    const usersQuery = useMemoFirebase(() => {
        if (userProfile?.userType !== 'admin') return null;
        return collection(firestore, 'users');
    }, [firestore, userProfile]);
    const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

    // This is a placeholder for a more complex aggregation logic for admins
    const allOrdersQuery = useMemoFirebase(() => {
        if (userProfile?.userType !== 'admin') return null;
        // In a real app, this would be a Cloud Function call.
        // We simulate by just showing an empty list or fetching the first vendor's orders as an example.
        if (users && users.length > 0) {
             const firstVendor = users.find(u => u.userType === 'vendor');
             if (firstVendor) {
                return collection(firestore, 'users', firstVendor.id, 'orders');
             }
        }
        return null;
    }, [firestore, userProfile, users]);
    const { data: allOrdersData, isLoading: areAllOrdersLoading } = useCollection<Order>(allOrdersQuery);
    
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
    const { data: vendorProfile, isLoading: isVendorProfileLoading } = useDoc(vendorProfileQuery);

    const vendorsQuery = useMemoFirebase(() => {
        if (userProfile?.userType !== 'admin') return null;
        return collection(firestore, 'vendors');
    }, [firestore, userProfile]);
    const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);


    const isLoading = isProfileLoading || areOrdersLoading || areClientsLoading || areProductsLoading || isVendorProfileLoading || areVendorsLoading || areAllOrdersLoading;

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
        return <ClientOrders orders={orders || []} products={products || []} vendor={vendorProfile} />;
    }

    if (userProfile.userType === 'admin') {
        // Here you would aggregate orders from all users if needed, which is complex on the client
        return <AdminOrders allOrders={allOrdersData || []} allVendors={vendors || []} />;
    }

    return <div>Access Denied. You do not have the required role to view this page.</div>;
}
