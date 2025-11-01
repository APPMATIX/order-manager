
'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/context/UserProfileContext';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Order, Client, Product, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Pie, PieChart, Cell } from 'recharts';
import { Loader2, Users, Package, ShoppingCart, DollarSign, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/config';

const STATUS_COLORS = {
    'Pending': 'hsl(var(--chart-1))',
    'Accepted': 'hsl(var(--chart-2))',
    'In Transit': 'hsl(var(--chart-3))',
    'Delivered': 'hsl(var(--chart-4))',
};

function VendorDashboard({ user, userProfile }: { user: any; userProfile: UserProfile }) {
  const firestore = useFirestore();

  const clientsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'clients'), limit(100)) : null),
    [firestore, user]
  );
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
  
  const productsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'products'), limit(100)) : null),
    [firestore, user]
  );
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

  const ordersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc'), limit(100)) : null),
    [firestore, user]
  );
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const {
    totalRevenue,
    pendingOrders,
    overdueInvoices,
    fulfillmentData,
    recentActivity
  } = useMemo(() => {
    if (!allOrders) return { totalRevenue: 0, pendingOrders: 0, overdueInvoices: 0, fulfillmentData: [], recentActivity: [] };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let revenue = 0;
    let pending = 0;
    let overdue = 0;
    const statusCounts = ORDER_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {} as Record<typeof ORDER_STATUSES[number], number>);

    allOrders.forEach(order => {
        const orderDate = (order.orderDate as Timestamp)?.toDate();
        if (orderDate && orderDate >= thirtyDaysAgo) {
            revenue += order.totalAmount;
        }
        if (order.status === 'Pending') {
            pending++;
        }
        if (order.paymentStatus === 'Overdue') {
            overdue++;
        }
        if (statusCounts[order.status] !== undefined) {
             statusCounts[order.status]++;
        }
    });
    
    const chartData = Object.entries(statusCounts)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));
        
    const activity = allOrders.slice(0, 5).map(order => `Order #${order.customOrderId} status updated to ${order.status}.`);

    return { totalRevenue: revenue, pendingOrders: pending, overdueInvoices: overdue, fulfillmentData: chartData, recentActivity: activity };
  }, [allOrders]);

  const recentOrders = useMemo(() => allOrders?.slice(0, 5) || [], [allOrders]);

  const isLoading = areClientsLoading || areProductsLoading || areOrdersLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description: string }) => (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
  );

  return (
    <>
    <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
    </div>
    <div className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <StatCard 
                title="Total Revenue"
                value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalRevenue)}
                icon={DollarSign}
                description="Last 30 days"
            />
             <StatCard 
                title="Pending Orders"
                value={pendingOrders}
                icon={ShoppingCart}
                description="Awaiting fulfillment"
            />
            <StatCard 
                title="Overdue Invoices"
                value={overdueInvoices}
                icon={AlertCircle}
                description="Require immediate attention"
            />
        </div>
        
        <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            <Card className="xl:col-span-2">
                <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                    Your 5 most recent orders.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {recentOrders && recentOrders.length > 0 ? (
                        <OrderList orders={recentOrders} userType="vendor" onView={() => {}} onUpdateStatus={() => {}} onDelete={() => {}} />
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No orders yet.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Fulfillment Status</CardTitle>
                    <CardDescription>
                    Breakdown of current order statuses.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={fulfillmentData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {fulfillmentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                            ))}
                        </Pie>
                         <Tooltip />
                         <Legend />
                    </PieChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                 <ul className="space-y-2 text-sm text-muted-foreground">
                    {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                      <li key={index}>{activity}</li>
                    )) : (
                      <li>No recent activity to display.</li>
                    )}
                 </ul>
              </CardContent>
            </Card>
        </div>
    </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  
  if (isProfileLoading || !userProfile || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (userProfile.userType === 'admin') {
    router.replace('/admin');
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (userProfile.userType === 'vendor') {
    return <VendorDashboard user={user} userProfile={userProfile} />
  }

  return null;
}
