'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/useUserProfile';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Order, Client, Product, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Loader2, Users, Package, ShoppingCart, DollarSign, Download, Calendar as CalendarIcon } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { format, subDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    if (!dateRange?.from || !dateRange?.to) return allOrders;

    return allOrders.filter(order => {
        if (!order.orderDate) return false;
        const orderDate = (order.orderDate as Timestamp).toDate();
        return isWithinInterval(orderDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allOrders, dateRange]);
  
  const recentOrdersData = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.slice(0, 5);
  }, [allOrders]);


  const totalRevenue = filteredOrders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;
  const totalOrders = filteredOrders?.length || 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  
  const salesData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const interval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    const data = interval.map(date => {
        const dateString = format(date, 'MMM d');
        const dailyTotal = filteredOrders?.filter(order => order.orderDate && format((order.orderDate as Timestamp).toDate(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                                 .reduce((sum, order) => sum + order.totalAmount, 0) || 0;
        return { name: dateString, total: dailyTotal };
    });
    return data;
  }, [filteredOrders, dateRange]);

  const downloadReport = () => {
    if (!filteredOrders) return;
  
    const fromDateStr = dateRange?.from ? format(dateRange.from, 'LLL dd, y') : 'N/A';
    const toDateStr = dateRange?.to ? format(dateRange.to, 'LLL dd, y') : 'N/A';
  
    let csvContent = '';
  
    // Title and Date Range
    csvContent += 'SALES REPORT\n';
    csvContent += `From:,"${fromDateStr}",To:,"${toDateStr}"\n\n`;
  
    // Summary Metrics
    csvContent += 'SUMMARY\n';
    const summaryHeaders = ['Total Revenue', 'Total Orders', 'Average Order Value'];
    const summaryData = [totalRevenue.toFixed(2), totalOrders, averageOrderValue.toFixed(2)];
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
            item.total.toFixed(2),
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


  const isLoading = areClientsLoading || areProductsLoading || areOrdersLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

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
                    "w-[300px] justify-start text-left font-normal",
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
        <Button onClick={downloadReport} disabled={!filteredOrders || filteredOrders.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalRevenue)}</div>
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
          <div className="text-2xl font-bold">{filteredOrders?.length || 0}</div>
        </CardContent>
      </Card>
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>
            {dateRange?.from && dateRange?.to ? 
            `Sales from ${format(dateRange.from, "LLL dd, y")} to ${format(dateRange.to, "LLL dd, y")}`
            : 'Sales over the selected period.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={salesData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `AED ${value}`} />
              <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}} formatter={(value) => `${new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(value as number)}`} />
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
    </>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  if (isProfileLoading || !userProfile || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (userProfile.userType !== 'vendor') {
    return (
        <div className="flex items-center justify-center h-64">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>This application is for vendors only.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

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
