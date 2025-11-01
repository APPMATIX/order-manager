'use client';
import React, { useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/context/UserProfileContext';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Order, UserProfile, PurchaseBill } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, AlertCircle } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { useRouter } from 'next/navigation';
import { format, subMonths, startOfMonth } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function VendorDashboard({ user, userProfile }: { user: any; userProfile: UserProfile }) {
  const firestore = useFirestore();
  const router = useRouter();

  const ordersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc'), limit(100)) : null),
    [firestore, user]
  );
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const purchasesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'purchase_bills'), orderBy('billDate', 'desc'), limit(100)) : null),
    [firestore, user]
  );
  const { data: allPurchases, isLoading: arePurchasesLoading } = useCollection<PurchaseBill>(purchasesQuery);


  const {
    totalRevenue,
    pendingOrders,
    overdueInvoices,
    recentActivity,
    monthlyPerformanceData,
  } = useMemo(() => {
    if (!allOrders || !allPurchases) return { totalRevenue: 0, pendingOrders: 0, overdueInvoices: 0, recentActivity: [], monthlyPerformanceData: [] };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let revenue = 0;
    let pending = 0;
    let overdue = 0;

    allOrders.forEach(order => {
        const orderDate = order.orderDate?.toDate();
        if (orderDate && orderDate >= thirtyDaysAgo) {
            revenue += order.totalAmount;
        }
        if (order.status === 'Pending') {
            pending++;
        }
        if (order.paymentStatus === 'Overdue') {
            overdue++;
        }
    });
        
    const activity = allOrders.slice(0, 5).map(order => `Order #${order.customOrderId} status updated to ${order.status}.`);

    // Monthly performance data
    const monthlyData: { [key: string]: { sales: number; purchases: number; profit: number } } = {};
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    for (let i = 0; i < 6; i++) {
        const monthDate = startOfMonth(subMonths(new Date(), i));
        const monthKey = format(monthDate, 'MMM yyyy');
        monthlyData[monthKey] = { sales: 0, purchases: 0, profit: 0 };
    }

    allOrders.forEach(order => {
        const orderDate = order.orderDate?.toDate();
        if (orderDate && orderDate >= sixMonthsAgo) {
            const monthKey = format(orderDate, 'MMM yyyy');
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].sales += order.totalAmount;
            }
        }
    });

    allPurchases.forEach(purchase => {
        const billDate = purchase.billDate?.toDate();
        if (billDate && billDate >= sixMonthsAgo) {
            const monthKey = format(billDate, 'MMM yyyy');
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].purchases += purchase.totalAmount;
            }
        }
    });

    const perfData = Object.entries(monthlyData).map(([name, data]) => ({
        name,
        Sales: data.sales,
        Purchases: data.purchases,
        Profit: data.sales - data.purchases,
    })).reverse();


    return { totalRevenue: revenue, pendingOrders: pending, overdueInvoices: overdue, recentActivity: activity, monthlyPerformanceData: perfData };
  }, [allOrders, allPurchases]);

  const recentOrders = useMemo(() => allOrders?.slice(0, 5) || [], [allOrders]);

  const isLoading = areOrdersLoading || arePurchasesLoading;

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
        
        <div className="mt-8 grid gap-8 md:grid-cols-1">
             <Card>
                <CardHeader>
                    <CardTitle>Monthly Performance</CardTitle>
                    <CardDescription>Sales, purchases, and profit over the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={monthlyPerformanceData}>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `AED ${value / 1000}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                }}
                            />
                            <Legend />
                            <Bar dataKey="Sales" fill="hsl(var(--chart-sales))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Purchases" fill="hsl(var(--chart-purchases))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Profit" fill="hsl(var(--chart-profit))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
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
                        <OrderList orders={recentOrders} userType="vendor" onView={(order) => router.push('/orders')} onUpdateStatus={() => {}} onDelete={() => {}} />
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No orders yet.
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card className="xl:col-span-1">
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
