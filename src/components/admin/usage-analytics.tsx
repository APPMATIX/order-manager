'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, ShoppingBag, Users, Package, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { UserProfile, Order, Product, Client } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/utils'; // We'll use a local version since we need multi-currency support

interface VendorStats {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  productCount: number;
  clientCount: number;
  totalRevenue: number;
  country: string;
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
    vendorStats: VendorStats[];
    statusDistribution: { name: string; value: number }[];
  }>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    vendorStats: [],
    statusDistribution: [],
  });

  useEffect(() => {
    async function fetchDetailedStats() {
      if (vendors.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const stats: VendorStats[] = [];
        let globalOrders = 0;
        let globalRevenue = 0;
        let globalProducts = 0;
        const statusMap: Record<string, number> = {};

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
          ordersSnap.forEach(doc => {
            const data = doc.data() as Order;
            vendorRevenue += data.totalAmount || 0;
            const status = data.status || 'Unknown';
            statusMap[status] = (statusMap[status] || 0) + 1;
          });

          stats.push({
            id: vendor.id,
            name: vendor.companyName || 'Unknown Vendor',
            email: vendor.email || '',
            orderCount: ordersSnap.size,
            productCount: productsSnap.size,
            clientCount: clientsSnap.size,
            totalRevenue: vendorRevenue,
            country: vendor.country,
          });

          globalOrders += ordersSnap.size;
          globalRevenue += vendorRevenue;
          globalProducts += productsSnap.size;
        }

        const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({
          name,
          value
        }));

        setPlatformStats({
          totalOrders: globalOrders,
          totalRevenue: globalRevenue,
          totalProducts: globalProducts,
          vendorStats: stats.sort((a, b) => b.totalRevenue - a.totalRevenue),
          statusDistribution
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
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Aggregating platform usage...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Processed Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{platformStats.totalOrders}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">Across all registered vendors</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Est. System Throughput</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {platformStats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Aggregated currency units</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Global Catalog Size</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{platformStats.totalProducts}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold">Unique items managed platform-wide</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Order Status Breakdown
            </CardTitle>
            <CardDescription>Visualizing efficiency across the platform workflow.</CardDescription>
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs uppercase font-bold tracking-widest">
                No orders found to analyze
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers Bar Chart */}
        <Card className="shadow-md border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <BarChart3 className="h-4 w-4 text-primary" />
              Vendor Revenue Benchmarking
            </CardTitle>
            <CardDescription>Revenue distribution among top registered vendors.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {platformStats.vendorStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformStats.vendorStats.slice(0, 5)}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="totalRevenue" fill="#0abab5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs uppercase font-bold tracking-widest">
                Insufficient data for benchmarking
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Vendor Detailed Usage */}
      <Card className="shadow-md border-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest">Global Vendor Activity Log</CardTitle>
          <CardDescription>Tracking engagement metrics per vendor account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px]">Vendor Identity</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Clients</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Products</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-center">Orders</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-right">Throughput</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformStats.vendorStats.map((vendor) => (
                  <TableRow key={vendor.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-primary">{vendor.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{vendor.id.substring(0, 12)}... ({vendor.country})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{vendor.clientCount}</TableCell>
                    <TableCell className="text-center font-bold">{vendor.productCount}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{vendor.orderCount}</TableCell>
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
