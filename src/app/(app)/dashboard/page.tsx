
'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/context/UserProfileContext';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Order, UserProfile, PurchaseBill, Client, Product } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, AlertCircle, Users, Package, Download } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function VendorDashboard({ user, userProfile }: { user: any; userProfile: UserProfile }) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const defaultDateRange: DateRange = {
    from: subMonths(new Date(), 1),
    to: new Date(),
  };
  const [date, setDate] = useState<DateRange | undefined>(defaultDateRange);

  const ordersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const purchasesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'purchase_bills'), orderBy('billDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: allPurchases, isLoading: arePurchasesLoading } = useCollection<PurchaseBill>(purchasesQuery);
  
  const clientsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'clients') : null),
    [firestore, user]
  );
  const { data: allClients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

  const productsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'products') : null),
    [firestore, user]
  );
  const { data: allProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);


  const filteredData = useMemo(() => {
    const from = date?.from ? startOfDay(date.from) : undefined;
    const to = date?.to ? endOfDay(date.to) : undefined;
    
    if (!from || !to) {
        return { filteredOrders: [], filteredPurchases: [] };
    }

    const filteredOrders = allOrders?.filter(order => {
        const orderDate = order.orderDate.toDate();
        return orderDate >= from && orderDate <= to;
    }) || [];

    const filteredPurchases = allPurchases?.filter(purchase => {
        const billDate = purchase.billDate.toDate();
        return billDate >= from && billDate <= to;
    }) || [];

    return { filteredOrders, filteredPurchases };

  }, [allOrders, allPurchases, date]);


  const {
    totalRevenue,
    totalPurchases,
    totalProfit,
    pendingOrders,
    overdueInvoices,
    recentActivity,
    monthlyPerformanceData,
  } = useMemo(() => {
    if (!allOrders || !allPurchases) return { totalRevenue: 0, totalPurchases: 0, totalProfit: 0, pendingOrders: 0, overdueInvoices: 0, recentActivity: [], monthlyPerformanceData: [] };
    
    const { filteredOrders, filteredPurchases } = filteredData;
    
    let revenue = 0;
    let pendingOrders = 0;
    let overdueInvoices = 0;

    filteredOrders.forEach(order => {
        revenue += order.totalAmount;
        if (order.status === 'Pending') {
            pendingOrders++;
        }
        if (order.paymentStatus === 'Overdue') {
            overdueInvoices++;
        }
    });

    const purchases = filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const profit = revenue - purchases;
        
    const activity = allOrders.slice(0, 5).map(order => `Order #${order.customOrderId} status updated to ${order.status}.`);

    // Monthly performance data
    const monthlyData: { [key: string]: { sales: number; purchases: number } } = {};
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    for (let i = 5; i >= 0; i--) {
        const monthDate = startOfMonth(subMonths(new Date(), i));
        const monthKey = format(monthDate, 'MMM yyyy');
        monthlyData[monthKey] = { sales: 0, purchases: 0 };
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

    const perfData = Object.entries(monthlyData).map(([name, data]) => {
        const profitOrLoss = data.sales - data.purchases;
        return {
            name,
            Sales: data.sales,
            Purchases: data.purchases,
            Profit: profitOrLoss > 0 ? profitOrLoss : 0,
            Loss: profitOrLoss < 0 ? Math.abs(profitOrLoss) : 0,
        };
    });


    return { totalRevenue: revenue, totalPurchases: purchases, totalProfit: profit, pendingOrders, overdueInvoices, recentActivity, monthlyPerformanceData: perfData };
  }, [allOrders, allPurchases, filteredData]);
  
  const generateSalesReport = () => {
    if (!filteredData.filteredOrders || filteredData.filteredOrders.length === 0) {
      toast({ title: 'No Data', description: 'There is no sales data in the selected date range to generate a report.' });
      return;
    }
    const headers = ['Order ID', 'Client Name', 'Order Date', 'Status', 'Payment Status', 'Subtotal', 'VAT', 'Total'];
    const data = filteredData.filteredOrders.map(order => [
      order.customOrderId,
      order.clientName,
      format(order.orderDate.toDate(), 'yyyy-MM-dd'),
      order.status,
      order.paymentStatus,
      order.subTotal,
      order.vatAmount,
      order.totalAmount
    ]);
    
    let csvContent = headers.join(',') + '\n';
    data.forEach(rowArray => {
      let row = rowArray.map(item => (typeof item === 'string' && item.includes(',')) ? `"${item}"` : item).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
     toast({ title: 'Report Generated', description: `Sales report has been downloaded.` });
  }

  const recentOrders = useMemo(() => allOrders?.slice(0, 5) || [], [allOrders]);

  const isLoading = areOrdersLoading || arePurchasesLoading || areClientsLoading || areProductsLoading;

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
    <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
             <Button onClick={generateSalesReport} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Report
            </Button>
        </div>
    </div>
    <div className="mt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
                title="Total Revenue"
                value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalRevenue)}
                icon={DollarSign}
                description="In selected date range"
            />
            <StatCard 
                title="Total Purchases"
                value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalPurchases)}
                icon={ShoppingCart}
                description="In selected date range"
            />
            <StatCard 
                title="Total Profit"
                value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalProfit)}
                icon={totalProfit >= 0 ? DollarSign : AlertCircle}
                description="In selected date range"
            />
             <StatCard 
                title="Total Clients"
                value={allClients?.length || 0}
                icon={Users}
                description="Total active clients"
            />
        </div>
        
        <div className="mt-8 grid gap-8 md:grid-cols-1">
             <Card>
                <CardHeader>
                    <CardTitle>Monthly Performance</CardTitle>
                    <CardDescription>Sales, purchases, and profit/loss over the last 6 months.</CardDescription>
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
                             <Bar dataKey="Loss" fill="hsl(var(--chart-loss))" radius={[4, 4, 0, 0]} />
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
