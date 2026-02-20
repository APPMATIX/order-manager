'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, ShoppingBag, Users, Package, BarChart3, PieChart as PieChartIcon, Printer, Zap, Activity, Globe } from 'lucide-react';
import type { UserProfile, Order } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

interface VendorStats {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  productCount: number;
  clientCount: number;
  totalRevenue: number;
  totalPrints: number;
  country: string;
}

interface TrafficPoint {
  date: string;
  orders: number;
}

interface UsageAnalyticsProps {
  vendors: UserProfile[];
}

export function UsageAnalytics({ vendors }: UsageAnalyticsProps) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<{
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    totalPrints: number;
    averageLatency: number;
    vendorStats: VendorStats[];
    statusDistribution: { name: string; value: number }[];
    trafficData: TrafficPoint[];
  }>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalPrints: 0,
    averageLatency: 0,
    vendorStats: [],
    statusDistribution: [],
    trafficData: [],
  });

  useEffect(() => {
    async function fetchDetailedStats() {
      if (vendors.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const startTime = performance.now();
      
      try {
        const stats: VendorStats[] = [];
        let globalOrders = 0;
        let globalRevenue = 0;
        let globalProducts = 0;
        let globalPrints = 0;
        const statusMap: Record<string, number> = {};
        
        // Traffic initialization (last 7 days)
        const trafficMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = format(subDays(new Date(), i), 'MMM dd');
          trafficMap[d] = 0;
        }

        // Fetch metrics for each vendor
        for (const vendor of vendors) {
          const ordersRef = collection(firestore, 'users', vendor.id, 'orders');
          const productsRef = collection(firestore, 'users', vendor.id, 'products');
          const clientsRef = collection(firestore, 'users', vendor.id, 'clients');

          const [ordersSnap, productsSnap, clientsSnap] = await Promise.all([
            getDocs(ordersRef),
            getDocs(productsRef),
            getDocs(clientsRef)
          ]);

          let vendorRevenue = 0;
          let vendorPrints = 0;
          ordersSnap.forEach(doc => {
            const data = doc.data() as Order;
            vendorRevenue += data.totalAmount || 0;
            vendorPrints += data.printCount || 0;
            
            // Status aggregation
            const status = data.status || 'Unknown';
            statusMap[status] = (statusMap[status] || 0) + 1;

            // Traffic aggregation
            if (data.createdAt) {
              const orderDate = data.createdAt.toDate();
              const dateKey = format(orderDate, 'MMM dd');
              if (trafficMap[dateKey] !== undefined) {
                trafficMap[dateKey]++;
              }
            }
          });

          stats.push({
            id: vendor.id,
            name: vendor.companyName || 'Unknown Vendor',
            email: vendor.email || '',
            orderCount: ordersSnap.size,
            productCount: productsSnap.size,
            clientCount: clientsSnap.size,
            totalRevenue: vendorRevenue,
            totalPrints: vendorPrints,
            country: vendor.country,
          });

          globalOrders += ordersSnap.size;
          globalRevenue += vendorRevenue;
          globalProducts += productsSnap.size;
          globalPrints += vendorPrints;
        }

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({
          name,
          value
        }));

        const trafficData = Object.entries(trafficMap).map(([date, orders]) => ({
          date,
          orders
        }));

        setPlatformStats({
          totalOrders: globalOrders,
          totalRevenue: globalRevenue,
          totalProducts: globalProducts,
          totalPrints: globalPrints,
          averageLatency: latency,
          vendorStats: stats.sort((a, b) => b.totalRevenue - a.totalRevenue),
          statusDistribution,
          trafficData
        });
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetailedStats();
  }, [vendors, firestore]);

  const COLORS = ['#0abab5', '#FF8042', '#0088FE', '#00C49F', '#FFBB28'];

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Profiling system performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance & Global Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Zap className="h-12 w-12 text-primary" /></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">System Speed</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{platformStats.averageLatency}ms</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Avg Data Fetch Latency</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Activity className="h-12 w-12 text-primary" /></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Platform Traffic</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{platformStats.totalOrders}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Total Success Transactions</p>
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
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Aggregated Gross Volume</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Print Events</CardTitle>
            <Printer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{platformStats.totalPrints}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Document Output Frequency</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Traffic Chart */}
        <Card className="lg:col-span-2 shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Activity className="h-4 w-4 text-primary" />
              Platform Transaction Traffic (7 Days)
            </CardTitle>
            <CardDescription>Daily order volume across all vendors.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformStats.trafficData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
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

        {/* Status Distribution */}
        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Order Workflow
            </CardTitle>
            <CardDescription>Status distribution health.</CardDescription>
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
                    {platformStats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs uppercase font-bold tracking-widest">
                Insufficient traffic data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Productivity Benchmark */}
        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <BarChart3 className="h-4 w-4 text-primary" />
              Vendor Productivity Benchmark
            </CardTitle>
            <CardDescription>Top 5 Vendors by Transaction vs Inventory size.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {platformStats.vendorStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformStats.vendorStats.slice(0, 5)}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: '10px' }} />
                  <Bar name="Orders" dataKey="orderCount" fill="#0abab5" radius={[4, 4, 0, 0]} />
                  <Bar name="Products" dataKey="productCount" fill="#FF8042" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs uppercase font-bold tracking-widest">
                No active traffic logs
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Registry */}
        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Globe className="h-4 w-4 text-primary" />
              Regional Market Depth
            </CardTitle>
            <CardDescription>Vendor distribution by Operating Region.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {platformStats.vendorStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        platformStats.vendorStats.reduce((acc, v) => {
                          acc[v.country] = (acc[v.country] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {platformStats.vendorStats.map((_, index) => (
                        <Cell key={`cell-region-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
               <div className="flex items-center justify-center h-full text-muted-foreground text-xs uppercase font-bold tracking-widest">
                No regional data
              </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Per-Vendor Usage Table */}
      <Card className="shadow-md border-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest">Global Activity Log (Per Vendor)</CardTitle>
          <CardDescription>Real-time metrics tracking throughput and registry engagement.</CardDescription>
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
                        <span className="text-[9px] text-muted-foreground font-mono">UID: {vendor.id.substring(0, 12)}... ({vendor.country})</span>
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
