'use client';
import React, { useMemo } from 'react';
import type { User, UserProfile, Order } from '@/lib/types';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2, ShoppingBag, Clock, DollarSign, TrendingUp, PieChart as PieChartIcon, ArrowRight, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCountry } from '@/context/CountryContext';
import { OrderList } from '../orders/order-list';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { format, subMonths } from 'date-fns';

interface ClientDashboardProps {
    user: User;
    userProfile: UserProfile;
}

const COLORS = ['#0abab5', '#FF8042', '#0088FE', '#00C49F', '#FFBB28'];

export default function ClientDashboard({ user, userProfile }: ClientDashboardProps) {
    const { formatCurrency, countryConfig } = useCountry();
    const firestore = useFirestore();

    // Correct path ownership: users/${loggedInUid}/orders
    const ordersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'orders'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user]);

    const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

    const stats = useMemo(() => {
        if (!orders) return { totalOrders: 0, activeOrders: 0, totalSpend: 0, monthlyData: [], statusData: [], topProducts: [] };

        const totalOrders = orders.length;
        const activeOrders = orders.filter(o => ['Awaiting Pricing', 'Pending', 'In Transit'].includes(o.status)).length;
        const totalSpend = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

        const statusMap: Record<string, number> = {};
        orders.forEach(o => {
            statusMap[o.status] = (statusMap[o.status] || 0) + 1;
        });
        const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        const monthlyMap: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            monthlyMap[format(date, 'MMM yy')] = 0;
        }
        orders.forEach(o => {
            if (o.createdAt) {
                const dateKey = format(o.createdAt.toDate(), 'MMM yy');
                if (monthlyMap[dateKey] !== undefined) {
                    monthlyMap[dateKey] += (o.totalAmount || 0);
                }
            }
        });
        const monthlyData = Object.entries(monthlyMap).map(([name, spend]) => ({ name, spend }));

        const productMap: Record<string, number> = {};
        orders.forEach(o => {
            o.lineItems.forEach(item => {
                const name = item.productName || item.name || 'Unknown';
                productMap[name] = (productMap[name] || 0) + (item.quantity || 0);
            });
        });
        const topProducts = Object.entries(productMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        return { totalOrders, activeOrders, totalSpend, monthlyData, statusData, topProducts };
    }, [orders]);

    if (areOrdersLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Purchasing Portal</h1>
                    <p className="text-sm text-muted-foreground">Monitor order fulfillment and spending trends.</p>
                </div>
                <Button asChild size="lg" className="font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                    <Link href="/place-order">Place New Order <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lifetime Volume</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{stats.totalOrders}</div>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Total orders processed</p>
                    </CardContent>
                </Card>
                <Card className="border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Pipeline</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{stats.activeOrders}</div>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Pending & In-transit</p>
                    </CardContent>
                </Card>
                <Card className="border-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gross Spend</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{formatCurrency(stats.totalSpend)}</div>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Aggregated account value</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 shadow-md border-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Account Spend Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${countryConfig.currencySymbol}${v >= 1000 ? (v/1000) + 'k' : v}`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(v: number) => formatCurrency(v)} 
                                />
                                <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-md border-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4 text-primary" />
                            Order Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {stats.statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {stats.statusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Initial sync...</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-md border-primary/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Recent Transactions</CardTitle>
                        <CardDescription>Your latest fulfilled and pending orders.</CardDescription>
                    </div>
                    <Button variant="ghost" asChild className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                        <Link href="/orders">Manage History <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {orders && orders.length > 0 ? (
                        <OrderList orders={orders.slice(0, 5)} userType="client" onView={() => {}} />
                    ) : (
                        <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest">No order data found</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}