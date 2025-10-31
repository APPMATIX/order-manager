
'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/context/UserProfileContext';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Order, Client, Product, UserProfile, PurchaseBill } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import { Loader2, Users, Package, ShoppingCart, DollarSign, Download, Calendar as CalendarIcon, ArrowRight, TrendingUp, Shield } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { format, subDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

function VendorDashboard({ user, userProfile }: { user: any; userProfile: UserProfile }) {
  const firestore = useFirestore();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

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
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const billsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'purchase_bills'), orderBy('billDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: allBills, isLoading: areBillsLoading } = useCollection<PurchaseBill>(billsQuery);

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    if (!dateRange?.from || !dateRange?.to) return allOrders;

    return allOrders.filter(order => {
        if (!order.orderDate) return false;
        const orderDate = (order.orderDate as Timestamp).toDate();
        return isWithinInterval(orderDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allOrders, dateRange]);
  
  const filteredBills = useMemo(() => {
    if (!allBills) return [];
    if (!dateRange?.from || !dateRange?.to) return allBills;

    return allBills.filter(bill => {
        if (!bill.billDate) return false;
        const billDate = (bill.billDate as Timestamp).toDate();
        return isWithinInterval(billDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allBills, dateRange]);


  const recentOrdersData = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.slice(0, 5);
  }, [allOrders]);


  const totalRevenue = filteredOrders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;
  const totalCogs = filteredBills?.reduce((acc, bill) => acc + bill.totalAmount, 0) || 0;
  const totalProfit = totalRevenue - totalCogs;
  const totalOrders = filteredOrders?.length || 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  
  const dailyPerformanceData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const interval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return interval.map(date => {
        const dateString = format(date, 'MMM d');
        const formattedDate = format(date, 'yyyy-MM-dd');

        const dailySales = filteredOrders
            ?.filter(order => order.orderDate && format((order.orderDate as Timestamp).toDate(), 'yyyy-MM-dd') === formattedDate)
            .reduce((sum, order) => sum + order.totalAmount, 0) || 0;
        
        const dailyPurchases = filteredBills
            ?.filter(bill => bill.billDate && format((bill.billDate as Timestamp).toDate(), 'yyyy-MM-dd') === formattedDate)
            .reduce((sum, bill) => sum + bill.totalAmount, 0) || 0;
        
        const dailyProfit = dailySales - dailyPurchases;

        return { 
            name: dateString, 
            sales: dailySales,
            purchases: dailyPurchases,
            profit: dailyProfit >= 0 ? dailyProfit : 0,
            loss: dailyProfit < 0 ? -dailyProfit : 0,
        };
    });
  }, [filteredOrders, filteredBills, dateRange]);

  const downloadReport = () => {
    if (!filteredOrders) return;
  
    const fromDateStr = dateRange?.from ? format(dateRange.from, 'LLL dd, y') : 'N/A';
    const toDateStr = dateRange?.to ? format(dateRange.to, 'LLL dd, y') : 'N.A';
  
    let csvContent = '';
  
    // Title and Date Range
    csvContent += 'SALES AND PROFITABILITY REPORT\n';
    csvContent += `From:,"${fromDateStr}",To:,"${toDateStr}"\n\n`;
  
    // Summary Metrics
    csvContent += 'SUMMARY\n';
    const summaryHeaders = ['Total Revenue', 'Total Purchase', 'Total Profit', 'Total Orders', 'Average Order Value'];
    const summaryData = [totalRevenue.toFixed(2), totalCogs.toFixed(2), totalProfit.toFixed(2), totalOrders, averageOrderValue.toFixed(2)];
    csvContent += summaryHeaders.join(',') + '\n';
    csvContent += summaryData.join(',') + '\n\n';
  
    // Detailed Orders Table
    csvContent += 'DETAILED ORDERS\n';
    const orderHeaders = ['Order ID', 'Client Name', 'Order Date', 'Status', 'Payment Status', 'Invoice Type', 'Total Amount (AED)'];
    const lineItemHeaders = [
      '', // Offset for master-detail format
      'Product Name',
      'Unit',
      'Quantity',
      'Unit Price',
      'Line Total',
    ];
  
    filteredOrders.forEach(order => {
      // Main Order Row
      const orderRow = [
        order.customOrderId || order.id,
        `"${order.clientName.replace(/"/g, '""')}"`,
        format((order.orderDate as Timestamp).toDate(), 'yyyy-MM-dd'),
        order.status,
        order.paymentStatus,
        order.invoiceType,
        order.totalAmount.toFixed(2),
      ];
      csvContent += orderHeaders.join(',') + '\n';
      csvContent += orderRow.join(',') + '\n';
  
      // Line Item Sub-table
      if (order.lineItems && order.lineItems.length > 0) {
        csvContent += lineItemHeaders.join(',') + '\n';
        order.lineItems.forEach(item => {
          const itemRow = [
            '', // Offset
            `"${item.productName.replace(/"/g, '""')}"`,
            item.unit,
            item.quantity,
            item.unitPrice.toFixed(2),
            (item.quantity * item.unitPrice).toFixed(2),
          ];
          csvContent += itemRow.join(',') + '\n';
        });
      }
      csvContent += '\n'; // Add a blank line for separation
    });
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fromDateFile = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start';
    const toDateFile = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end';
    link.setAttribute('download', `sales_report_${fromDateFile}_to_${toDateFile}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const isLoading = areClientsLoading || areProductsLoading || areOrdersLoading || areBillsLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  const StatCard = ({ title, value, icon: Icon, href }: { title: string, value: string | number, icon: React.ElementType, href?: string }) => {
    const cardContent = (
      <Card className="transition-all hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );

    if (href) {
      return <Link href={href}>{cardContent}</Link>;
    }
    return cardContent;
  };


  const CurrencyFormatter = (value: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const salesValue = payload.find((p: any) => p.dataKey === 'sales')?.value || 0;
      const purchasesValue = payload.find((p: any) => p.dataKey === 'purchases')?.value || 0;
      const profitValue = payload.find((p: any) => p.dataKey === 'profit')?.value || 0;
      const lossValue = payload.find((p: any) => p.dataKey === 'loss')?.value || 0;
      const netValue = profitValue - lossValue;
  
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold">{label}</p>
            {salesValue > 0 && (
                <p className="text-xs" style={{ color: 'hsl(var(--chart-sales))' }}>
                <span className="font-medium">Sales:</span> {CurrencyFormatter(salesValue)}
                </p>
            )}
            {purchasesValue > 0 && (
                <p className="text-xs" style={{ color: 'hsl(var(--chart-purchases))' }}>
                <span className="font-medium">Purchases:</span> {CurrencyFormatter(purchasesValue)}
                </p>
            )}
            <p className={`text-xs ${netValue >= 0 ? '' : ''}`} style={{ color: netValue >=0 ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'}}>
               <span className="font-medium">{netValue >= 0 ? 'Profit:' : 'Loss:'}</span> {CurrencyFormatter(Math.abs(netValue))}
            </p>
          </div>
        </div>
      );
    }
  
    return null;
  };


  return (
    <>
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div className="grid gap-2">
             <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(dateRange.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
        </div>
        <Button onClick={downloadReport} disabled={!filteredOrders || filteredOrders.length === 0} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard 
            title="Total Revenue"
            value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalRevenue)}
            icon={DollarSign}
        />
         <StatCard 
            title="Total Purchase"
            value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalCogs)}
            icon={ShoppingCart}
            href="/purchase"
        />
        <StatCard 
            title="Total Profit"
            value={new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalProfit)}
            icon={TrendingUp}
        />
        <StatCard 
            title="Total Clients"
            value={clients?.length || 0}
            icon={Users}
            href="/clients"
        />
        <StatCard 
            title="Total Products"
            value={products?.length || 0}
            icon={Package}
            href="/products"
        />
    </div>
    
    <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
            <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>
                {dateRange?.from && dateRange?.to ? 
                `Daily sales, purchases, and profit from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`
                : 'Daily performance over the selected period.'}
            </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dailyPerformanceData}>
                 <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', notation: 'compact' }).format(value as number)}`} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}} />
                <Legend />
                <Bar dataKey="sales" fill="hsl(var(--chart-sales))" name="Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" fill="hsl(var(--chart-purchases))" name="Purchases" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" stackId="a" fill="hsl(var(--chart-profit))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loss" name="Loss" stackId="a" fill="hsl(var(--chart-loss))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                    Your latest 5 orders.
                    </CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="/orders">
                    View All
                    <ArrowRight className="h-4 w-4" />
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
    </>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  
  // A robust loading state that waits for all auth information.
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
  
  // Only if the user is a confirmed vendor, render the vendor dashboard.
  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
      </div>
      <div className="mt-4">
          <VendorDashboard user={user} userProfile={userProfile} />
      </div>
    </>
  )
}

    