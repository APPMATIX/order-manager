
'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Order, UserProfile, PurchaseBill, Client, Product, User } from '@/lib/types';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
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
import { format, startOfMonth, subMonths, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';


type Activity = {
  id: string;
  type: 'order' | 'client' | 'product';
  text: string;
  date: Date;
  href: string;
  icon: React.ElementType;
};

interface VendorDashboardProps {
    user: User;
    userProfile: UserProfile;
}

export default function VendorDashboard({ user, userProfile }: VendorDashboardProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const defaultDateRange: DateRange = {
    from: subMonths(new Date(), 1),
    to: new Date(),
  };
  const [date, setDate] = useState<DateRange | undefined>(defaultDateRange);

  const ordersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'orders'), where('vendorId', '==', user.uid), orderBy('createdAt', 'desc')) : null),
    [firestore, user]
  );
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const purchasesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'purchase_bills'), orderBy('billDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: allPurchases, isLoading: arePurchasesLoading } = useCollection<PurchaseBill>(purchasesQuery);
  
  const clientsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'clients'), orderBy('createdAt', 'desc')) : null),
    [firestore, user]
  );
  const { data: allClients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

  const productsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'products'), orderBy('createdAt', 'desc')) : null),
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
        const orderDate = order.orderDate instanceof Timestamp ? order.orderDate.toDate() : new Date(order.orderDate as unknown as string);
        return orderDate && orderDate >= from && orderDate <= to;
    }) || [];

    const filteredPurchases = allPurchases?.filter(purchase => {
        const billDate = purchase.billDate instanceof Timestamp ? purchase.billDate.toDate() : new Date(purchase.billDate as unknown as string);
        return billDate && billDate >= from && billDate <= to;
    }) || [];

    return { filteredOrders, filteredPurchases };

  }, [allOrders, allPurchases, date]);


  const {
    totalRevenue,
    totalPurchases,
    totalProfit,
    recentActivity,
    monthlyPerformanceData,
  } = useMemo(() => {
    if (!allOrders || !allPurchases || !allClients || !allProducts) {
        return { 
            totalRevenue: 0, 
            totalPurchases: 0, 
            totalProfit: 0, 
            recentActivity: [],
            monthlyPerformanceData: [] 
        };
    }
    
    const { filteredOrders, filteredPurchases } = filteredData;
    
    let revenue = 0;
    
    filteredOrders.forEach(order => {
        revenue += order.totalAmount || 0;
    });

    const purchases = filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const profit = revenue - purchases;
        
    const orderActivities: Activity[] = (allOrders || []).slice(0, 3).map(order => ({
        id: order.id,
        type: 'order',
        text: `New order #${order.customOrderId} from ${order.clientName}.`,
        date: order.createdAt.toDate(),
        href: '/orders',
        icon: ShoppingCart,
    }));
    
    const clientActivities: Activity[] = (allClients || []).slice(0, 2).map(client => ({
        id: client.id,
        type: 'client',
        text: `New client signed up: ${client.name}.`,
        date: client.createdAt!.toDate(),
        href: '/clients',
        icon: Users,
    }));

     const productActivities: Activity[] = (allProducts || []).slice(0, 2).map(product => ({
        id: product.id,
        type: 'product',
        text: `New product added: ${product.name}.`,
        date: product.createdAt!.toDate(),
        href: '/products',
        icon: Package,
    }));

    const combinedActivities = [...orderActivities, ...clientActivities, ...productActivities]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);
        

    // Monthly performance data
    const monthlyData: { [key: string]: { sales: number; purchases: number } } = {};

    for (let i = 5; i >= 0; i--) {
        const monthDate = startOfMonth(subMonths(new Date(), i));
        const monthKey = format(monthDate, 'MMM yyyy');
        monthlyData[monthKey] = { sales: 0, purchases: 0 };
    }

    allOrders.forEach(order => {
        const orderDate = order.orderDate?.toDate();
        if (orderDate) {
            const monthKey = format(orderDate, 'MMM yyyy');
            if (monthlyData[monthKey] && order.totalAmount) {
                monthlyData[monthKey].sales += order.totalAmount;
            }
        }
    });

    allPurchases.forEach(purchase => {
        const billDate = purchase.billDate?.toDate();
        if (billDate) {
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

    return { totalRevenue: revenue, totalPurchases: purchases, totalProfit: profit, recentActivity: combinedActivities, monthlyPerformanceData: perfData };
  }, [allOrders, allPurchases, allClients, allProducts, filteredData]);
  
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
      order.paymentStatus || 'N/A',
      order.subTotal || 0,
      order.vatAmount || 0,
      order.totalAmount || 0
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
  
  const StatCard = ({ title, value, icon: Icon, description, onClick }: { title: string, value: string | number, icon: React.ElementType, description: string, onClick?: () => void }) => (
      <Card className="transition-transform duration-200 hover:scale-105" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
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
             <Button onClick={generateSalesReport} size="sm">
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
                 onClick={() => router.push('/purchase')}
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
                onClick={() => router.push('/clients')}
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
                        <OrderList orders={recentOrders} userType="vendor" onView={(order) => router.push('/orders')} />
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
                <CardDescription>A feed of the latest events in your store.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                        <li key={activity.id} className="flex items-start gap-4">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-secondary">
                               <activity.icon className="h-5 w-5 text-secondary-foreground" />
                            </div>
                            <div>
                                <Link href={activity.href} className="font-medium hover:underline text-sm">
                                    {activity.text}
                                </Link>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(activity.date, { addSuffix: true })}
                                </p>
                            </div>
                        </li>
                        ))
                    ) : (
                        <li className="text-center text-muted-foreground py-4">
                        No recent activity to display.
                        </li>
                    )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    </div>
    </>
  );
}
