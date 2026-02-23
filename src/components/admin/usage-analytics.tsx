'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, DocumentData, FirestoreError } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, Zap, Activity, Globe, Printer, ShoppingBag, Package, Users, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { UserProfile, Order } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { format, subDays } from 'date-fns';

interface VendorLiveMetrics {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  productCount: number;
  clientCount: number;
  totalRevenue: number;
  totalPrints: number;
  country: string;
  statusMap: Record<string, number>;
  trafficMap: Record<string, number>;
}

interface UsageAnalyticsProps {
  vendors: UserProfile[];
}

export function UsageAnalytics({ vendors }: UsageAnalyticsProps) {
  const firestore = useFirestore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [vendorMetricsMap, setVendorLiveMap] = useState<Record<string, VendorLiveMetrics>>({});
  const [latency, setLatency] = useState(0);

  // Initialize and maintain real-time listeners for each vendor
  useEffect(() => {
    if (vendors.length === 0) {
      setIsInitializing(false);
      return;
    }

    const startTimer = performance.now();
    const unsubscribers: (() => void)[] = [];

    // 1. Initial State Sync: Ensure every vendor has a metrics object with basic info
    const initialMap: Record<string, VendorLiveMetrics> = {};
    vendors.forEach(v => {
      initialMap[v.id] = {
        id: v.id,
        name: v.companyName || 'Unknown',
        email: v.email || '',
        country: v.country || 'AE',
        orderCount: 0,
        productCount: 0,
        clientCount: 0,
        totalRevenue: 0,
        totalPrints: 0,
        statusMap: {},
        trafficMap: {}
      };
    });
    setVendorLiveMap(initialMap);

    vendors.forEach((vendor) => {
      // 2. Orders Listener
      const ordersRef = collection(firestore, 'users', vendor.id, 'orders');
      const unsubOrders = onSnapshot(ordersRef, 
        (snapshot) => {
          let vendorRevenue = 0;
          let vendorPrints = 0;
          const statusMap: Record<string, number> = {};
          const trafficMap: Record<string, number> = {};
          
          // Initialize last 7 days for traffic
          for (let i = 6; i >= 0; i--) {
            trafficMap[format(subDays(new Date(), i), 'MMM dd')] = 0;
          }

          snapshot.forEach((doc) => {
            const data = doc.data() as Order;
            vendorRevenue += data.totalAmount || 0;
            vendorPrints += data.printCount || 0;
            
            const status = data.status || 'Unknown';
            statusMap[status] = (statusMap[status] || 0) + 1;

            if (data.createdAt) {
              const dateKey = format(data.createdAt.toDate(), 'MMM dd');
              if (trafficMap[dateKey] !== undefined) trafficMap[dateKey]++;
            }
          });

          setVendorLiveMap(prev => ({
            ...prev,
            [vendor.id]: {
              ...(prev[vendor.id] || initialMap[vendor.id]),
              orderCount: snapshot.size,
              totalRevenue: vendorRevenue,
              totalPrints: vendorPrints,
              statusMap,
              trafficMap
            }
          }));
          
          if (isInitializing) {
            setLatency(Math.round(performance.now() - startTimer));
            setIsInitializing(false);
          }
        },
        async (error: FirestoreError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: ordersRef.path,
            operation: 'list',
          }));
        }
      );

      // 3. Products Listener
      const productsRef = collection(firestore, 'users', vendor.id, 'products');
      const unsubProducts = onSnapshot(productsRef, 
        (snapshot) => {
          setVendorLiveMap(prev => ({
            ...prev,
            [vendor.id]: {
              ...(prev[vendor.id] || initialMap[vendor.id]),
              productCount: snapshot.size
            }
          }));
        },
        async (error: FirestoreError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productsRef.path,
            operation: 'list',
          }));
        }
      );

      // 4. Clients Listener
      const clientsRef = collection(firestore, 'users', vendor.id, 'clients');
      const unsubClients = onSnapshot(clientsRef, 
        (snapshot) => {
          setVendorLiveMap(prev => ({
            ...prev,
            [vendor.id]: {
              ...(prev[vendor.id] || initialMap[vendor.id]),
              clientCount: snapshot.size
            }
          }));
        },
        async (error: FirestoreError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: clientsRef.path,
            operation: 'list',
          }));
        }
      );

      unsubscribers.push(unsubOrders, unsubProducts, unsubClients);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [vendors, firestore]);

  // Aggregate global metrics from live vendor map
  const platformStats = useMemo(() => {
    const metrics = Object.values(vendorMetricsMap);
    const globalStatusMap: Record<string, number> = {};
    const globalTrafficMap: Record<string, number> = {};
    
    // Initialize global traffic
    for (let i = 6; i >= 0; i--) {
      globalTrafficMap[format(subDays(new Date(), i), 'MMM dd')] = 0;
    }

    let totalOrders = 0;
    let totalRevenue = 0;
    let totalPrints = 0;

    metrics.forEach(m => {
      totalOrders += m.orderCount || 0;
      totalRevenue += m.totalRevenue || 0;
      totalPrints += m.totalPrints || 0;

      if (m.statusMap) {
        Object.entries(m.statusMap).forEach(([status, count]) => {
          globalStatusMap[status] = (globalStatusMap[status] || 0) + count;
        });
      }

      if (m.trafficMap) {
        Object.entries(m.trafficMap).forEach(([date, count]) => {
          globalTrafficMap[date] = (globalTrafficMap[date] || 0) + count;
        });
      }
    });

    return {
      totalOrders,
      totalRevenue,
      totalPrints,
      vendorStats: metrics.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)),
      statusDistribution: Object.entries(globalStatusMap).map(([name, value]) => ({ name, value })),
      trafficData: Object.entries(globalTrafficMap).map(([date, orders]) => ({ date, orders }))
    };
  }, [vendorMetricsMap]);

  const COLORS = ['#0abab5', '#FF8042', '#0088FE', '#00C49F', '#FFBB28'];

  if (isInitializing) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Opening real-time channels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Zap className="h-12 w-12 text-primary" /></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Stream Latency</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{latency}ms</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Real-time sync speed</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Activity className="h-12 w-12 text-primary" /></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Live Transactions</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{platformStats.totalOrders}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Total Success events</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Global Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">
              {platformStats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Live Gross Volume</p>
          </CardHeader>
        </Card>

        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Print Events</CardTitle>
            <Printer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{platformStats.totalPrints}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Document throughput</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Activity className="h-4 w-4 text-primary" />
              Live Platform Traffic (7 Days)
            </CardTitle>
            <CardDescription>Aggregate daily order volume across all vendors.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformStats.trafficData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }} 
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Workflow Health
            </CardTitle>
            <CardDescription>Live status distribution.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {platformStats.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformStats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformStats.statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs uppercase font-bold tracking-widest">
                Waiting for traffic...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest">Live Vendor Activity Log</CardTitle>
          <CardDescription>Real-time metrics tracking throughput and engagement across the registry.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px]">Vendor Identity</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Orders</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Catalog</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Clients</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Prints</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-right">Gross Vol.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformStats.vendorStats.map((vendor) => (
                  <TableRow key={vendor.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-primary">{vendor.name}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">UID: {vendor.id?.substring(0, 12)}... ({vendor.country})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">{vendor.orderCount}</TableCell>
                    <TableCell className="text-center font-bold">{vendor.productCount}</TableCell>
                    <TableCell className="text-center font-bold">{vendor.clientCount}</TableCell>
                    <TableCell className="text-center font-bold text-orange-500">
                      <div className="flex items-center justify-center gap-1">
                        <Printer className="h-3 w-3" />
                        {vendor.totalPrints}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black">
                      {vendor.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
