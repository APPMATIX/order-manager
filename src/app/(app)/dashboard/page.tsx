'use client';
import React, { useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/useUserProfile';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Order, Client, Product, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Loader2, Users, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function VendorDashboard({ user, userProfile }: { user: any; userProfile: UserProfile }) {
  const firestore = useFirestore();

  const clientsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'clients') : null),
    [firestore, user]
  );
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsCollection);

  const productsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'products') : null),
    [firestore, user]
  );
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsCollection);

  const ordersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);
  
  const recentOrders = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc'), limit(5)) : null),
    [firestore, user]
  );
   const { data: recentOrdersData, isLoading: areRecentOrdersLoading } = useCollection<Order>(recentOrders);


  const totalRevenue = orders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;
  
  const salesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    const data = last7Days.map(date => {
        const dateString = format(date, 'MMM d');
        const dailyTotal = orders?.filter(order => order.orderDate && format(order.orderDate.toDate(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                                 .reduce((sum, order) => sum + order.totalAmount, 0) || 0;
        return { name: dateString, total: dailyTotal };
    });
    return data;
  }, [orders]);


  const isLoading = areClientsLoading || areProductsLoading || areOrdersLoading || areRecentOrdersLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clients?.length || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{products?.length || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{orders?.length || 0}</div>
        </CardContent>
      </Card>
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Sales Overview (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={salesData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}/>
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
       <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                A quick look at the latest 5 orders.
                </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/orders">
                View All
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
            {recentOrdersData && recentOrdersData.length > 0 ? (
                <OrderList orders={recentOrdersData} userType="vendor" onView={() => {}} onUpdateStatus={() => {}} onDelete={() => {}} />
            ) : (
                <div className="text-center text-muted-foreground py-8">No orders yet.</div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}


function ClientDashboard({ user, userProfile }: { user: any; userProfile: UserProfile }) {
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!user || !userProfile.vendorId) return null;
        return query(collection(firestore, 'users', userProfile.vendorId, 'orders'), orderBy('orderDate', 'desc'));
    }, [firestore, user, userProfile.vendorId]);
    const { data: allOrders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

    const recentOrdersQuery = useMemoFirebase(() => {
        if (!user || !userProfile.vendorId) return null;
        return query(collection(firestore, 'users', userProfile.vendorId, 'orders'), orderBy('orderDate', 'desc'), limit(5));
    }, [firestore, user, userProfile.vendorId]);

    const { data: recentOrdersData, isLoading: areRecentOrdersLoading } = useCollection<Order>(recentOrdersQuery);

    const userOrders = allOrders?.filter(order => order.clientId === user.uid);
    const userRecentOrders = recentOrdersData?.filter(order => order.clientId === user.uid);

    if (areOrdersLoading || areRecentOrdersLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }
    
    return (
        <div className="grid gap-4 md:gap-8">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Welcome back, {user.email}!</CardTitle>
                    <CardDescription>Here's a quick overview of your account.</CardDescription>
                </CardHeader>
                 <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Your Total Orders</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userOrders?.length || 0}</div>
                        </CardContent>
                    </Card>
                     <Card className="flex flex-col items-center justify-center">
                         <CardContent className="pt-6">
                            <Button asChild>
                                <Link href="/orders">Create a New Order</Link>
                            </Button>
                         </CardContent>
                    </Card>
                 </CardContent>
            </Card>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Your Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {userRecentOrders && userRecentOrders.length > 0 ? (
                         <OrderList orders={userRecentOrders} userType="client" onView={() => {}} onUpdateStatus={() => {}} onDelete={() => {}} />
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>You haven't placed any orders yet.</p>
                            <Button asChild variant="link">
                                <Link href="/orders">Create your first order</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  if (isProfileLoading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
     <>
        <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        </div>
        <div className="mt-4">
             {userProfile.userType === 'vendor' ? <VendorDashboard user={user} userProfile={userProfile} /> : <ClientDashboard user={user} userProfile={userProfile} />}
        </div>
     </>
  )
}
