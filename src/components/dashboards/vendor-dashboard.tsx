'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Order, UserProfile, PurchaseBill, Client, Product, User, LineItem } from '@/lib/types';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, DollarSign, ShoppingCart, AlertCircle, Users, Package, Download, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { OrderList } from '@/components/orders/order-list';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, subMonths, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useCountry } from '@/context/CountryContext';

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

const COLORS = ['#0abab5', '#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#8884d8', '#82ca9d'];

export default function VendorDashboard({ user, userProfile }: VendorDashboardProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { countryConfig, formatCurrency } = useCountry();

  const defaultDateRange: DateRange = {
    from: subMonths(new Date(), 1),
    to: new Date(),
  };
  const [date, setDate] = useState<DateRange | undefined>(defaultDateRange);

  const ordersQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc')) : null),
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

  const analytics = useMemo(() => {
    if (!allOrders || !allPurchases || !allClients || !allProducts) {
        return { 
            totalRevenue: 0, 
            totalPurchases: 0, 
            totalProfit: 0, 
            avgOrderValue: 0,
            recentActivity: [],
            monthlyPerformanceData: [],
            statusDistribution: [],
            topProducts: [],
            topClients: []
        };
    }
    
    const { filteredOrders, filteredPurchases } = filteredData;
    
    let revenue = 0;
    const productStats: Record<string, { name: string, total: number }> = {};
    const clientStats: Record<string, { name: string, total: number }> = {};
    const statusCounts: Record<string, number> = {};

    filteredOrders.forEach(order => {
        const orderTotal = order.totalAmount || 0;
        revenue += orderTotal;
        
        // Status Distribution
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

        // Top Clients
        if (order.clientId) {
            if (!clientStats[order.clientId]) {
                clientStats[order.clientId] = { name: order.clientName || 'Unknown Client', total: 0 };
            }
            clientStats[order.clientId].total += orderTotal;
        }

        // Top Products
        order.lineItems.forEach(item => {
            const prodName = item.productName || item.name || 'Unknown Product';
            const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
            if (!productStats[prodName]) {
                productStats[prodName] = { name: prodName, total: 0 };
            }
            productStats[prodName].total += lineTotal;
        });
    });

    const purchases = filteredPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const profit = revenue - purchases;
    const avgOrderValue = filteredOrders.length > 0 ? revenue / filteredOrders.length : 0;

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
        text: `New client: ${client.name}.`,
        date: client.createdAt!.toDate(),
        href: '/clients',
        icon: Users,
    }));

    const productActivities: Activity[] = (allProducts || []).slice(0, 2).map(product => ({
        id: product.id,
        type: 'product',
        text: `New product: ${product.name}.`,
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

    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const topProductsData = Object.values(productStats).sort((a, b) => b.total - a.total).slice(0, 5);
    const topClientsData = Object.values(clientStats).sort((a, b) => b.total - a.total).slice(0, 5);

    return { 
        totalRevenue: revenue, 
        totalPurchases: purchases, 
        totalProfit: profit, 
        avgOrderValue,
        recentActivity: combinedActivities, 
        monthlyPerformanceData: perfData,
        statusDistribution,
        topProducts: topProductsData,
        topClients: topClientsData
    };
  }, [allOrders, allPurchases, allClients, allProducts, filteredData]);
  
  const generateSalesReport = () => {
    if (!filteredData.filteredOrders || filteredData.filteredOrders.length === 0) {
      toast({ title: 'No Data', description: 'There is no sales data in the selected range.' });
      return;
    }
    const headers = ['Order ID', 'Client Name', 'Order Date', 'Status', 'Total'];
    const data = filteredData.filteredOrders.map(order => [
      order.customOrderId,
      order.clientName,
      format(order.orderDate.toDate(), 'yyyy-MM-dd'),
      order.status,
      order.totalAmount || 0
    ]);
    
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      csvContent += row.map(item => (typeof item === 'string' && item.includes(',')) ? `"${item}"` : item).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Report Generated' });
  }

  const recentOrders = useMemo(() => allOrders?.slice(0, 5) || [], [allOrders]);
  const isLoading = areOrdersLoading || arePurchasesLoading || areClientsLoading || areProductsLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  const StatCard = ({ title, value, icon: Icon, description, colorClass }: { title: string, value: string | number, icon: React.ElementType, description: string, colorClass?: string }) => (
      <Card className="transition-all duration-300 hover:shadow-lg border-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={cn("h-4 w-4", colorClass || "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black">{value}</div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
  );

  return (
    <>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Business Dashboard</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal border-primary/20",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {date?.from ? (
                    date.to ? (
                        <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date range</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
             <Button onClick={generateSalesReport} size="sm" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Revenue" value={formatCurrency(analytics.totalRevenue)} icon={DollarSign} description="Gross Sales" colorClass="text-green-500" />
        <StatCard title="Total Purchases" value={formatCurrency(analytics.totalPurchases)} icon={ShoppingCart} description="Inventory Cost" colorClass="text-red-500" />
        <StatCard title="Total Profit" value={formatCurrency(analytics.totalProfit)} icon={TrendingUp} description="Net Margin" colorClass="text-primary" />
        <StatCard title="Avg. Order Value" value={formatCurrency(analytics.avgOrderValue)} icon={BarChart3} description="Per transaction" colorClass="text-orange-500" />
        <StatCard title="Client Base" value={allClients?.length || 0} icon={Users} description="Registered Clients" colorClass="text-blue-500" />
    </div>
    
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Monthly Performance */}
        <Card className="lg:col-span-2 shadow-md border-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Revenue vs Cost Trends
                </CardTitle>
                <CardDescription>Consolidated performance over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${countryConfig.currencySymbol}${v > 1000 ? (v/1000) + 'k' : v}`} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            formatter={(v: number) => formatCurrency(v)} 
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                        <Bar dataKey="Sales" fill="hsl(var(--chart-sales))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Purchases" fill="hsl(var(--chart-purchases))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Profit" fill="hsl(var(--chart-profit))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="shadow-md border-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    Order Workflow
                </CardTitle>
                <CardDescription>Status distribution for selected range.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                {analytics.statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={analytics.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {analytics.statusDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-bold uppercase tracking-widest">No activity data</div>
                )}
            </CardContent>
        </Card>
    </div>

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card className="shadow-md border-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Top 5 Selling Products</CardTitle>
                <CardDescription>By total revenue contribution.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {analytics.topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={analytics.topProducts}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="total" fill="#0abab5" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Insufficient data</div>
                )}
            </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="shadow-md border-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Top 5 Clients</CardTitle>
                <CardDescription>By transaction volume.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                {analytics.topClients.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.topClients}>
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="total" fill="#FF8042" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Insufficient data</div>
                )}
            </CardContent>
        </Card>
    </div>

    <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2 shadow-md border-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Recent Orders</CardTitle>
                <CardDescription>Real-time transaction feed.</CardDescription>
            </CardHeader>
            <CardContent>
                {recentOrders.length > 0 ? (
                    <OrderList orders={recentOrders} userType="vendor" onView={(order) => router.push('/orders')} />
                ) : (
                    <div className="text-center text-muted-foreground py-8">No orders recorded yet.</div>
                )}
            </CardContent>
        </Card>

        <Card className="xl:col-span-1 shadow-md border-primary/5">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">System Activity</CardTitle>
                <CardDescription>Latest registry events.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                {analytics.recentActivity.length > 0 ? (
                    analytics.recentActivity.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-primary/10">
                           <activity.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <Link href={activity.href} className="font-bold text-xs hover:underline block">{activity.text}</Link>
                            <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(activity.date, { addSuffix: true })}</p>
                        </div>
                    </li>
                    ))
                ) : (
                    <li className="text-center text-muted-foreground py-4 text-xs">No recent activity</li>
                )}
                </ul>
            </CardContent>
        </Card>
    </div>
    </>
  );
}
