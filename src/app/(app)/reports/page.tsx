'use client';

import React, { useState, useMemo } from 'react';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import type { Client, Order, PurchaseBill } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const clientsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'clients') : null),
    [firestore, user]
  );
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsCollection);

  const ordersCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'orders') : null),
    [firestore, user]
  );
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersCollection);

  const purchasesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'purchase_bills') : null),
    [firestore, user]
  );
  const { data: purchases, isLoading: arePurchasesLoading } = useCollection<PurchaseBill>(purchasesCollection);
  
  const generateCSV = (headers: string[], data: (string|number)[][], filename: string) => {
    let csvContent = headers.join(',') + '\n';
    data.forEach(rowArray => {
      let row = rowArray.map(item => {
        if (typeof item === 'string' && (item.includes(',') || item.includes('\n'))) {
          return `"${item.replace(/"/g, '""')}"`;
        }
        return item;
      }).join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
     toast({ title: 'Report Generated', description: `${filename} has been downloaded.` });
  }

  const handleGenerateSalesReport = () => {
    if (!orders) return;
    setIsGenerating(true);
    
    const headers = [
      'Order ID', 
      'Client Name', 
      'Order Date', 
      'Status', 
      'Payment Status', 
      'Subtotal', 
      'VAT', 
      'Total', 
      'Total Cost', 
      'Profit', 
      'Margin %'
    ];

    const data = orders.map(order => {
      const totalCost = order.lineItems.reduce((acc, item) => 
        acc + ((item.costPrice || 0) * (item.quantity || 0)), 0
      );
      
      const profit = (order.subTotal || 0) - totalCost;
      const margin = (order.subTotal || 0) > 0 ? (profit / order.subTotal!) * 100 : 0;

      return [
        order.customOrderId || order.id,
        order.clientName,
        format(order.orderDate.toDate(), 'yyyy-MM-dd'),
        order.status,
        order.paymentStatus || 'N/A',
        (order.subTotal || 0).toFixed(2),
        (order.vatAmount || 0).toFixed(2),
        (order.totalAmount || 0).toFixed(2),
        totalCost.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(1) + '%'
      ];
    });

    generateCSV(headers, data, `sales_profit_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    setIsGenerating(false);
  };
  
  const handleGeneratePurchaseReport = () => {
     if (!purchases) return;
     setIsGenerating(true);
     const headers = ['Vendor Name', 'Bill Date', 'Subtotal', 'VAT', 'Total'];
     const data = purchases.map(p => [
        p.vendorName,
        format(p.billDate.toDate(), 'yyyy-MM-dd'),
        p.subTotal.toFixed(2),
        p.vatAmount.toFixed(2),
        p.totalAmount.toFixed(2)
     ]);
     generateCSV(headers, data, `purchases_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
     setIsGenerating(false);
  };

  const handleGenerateClientReport = async () => {
    if (!user || !selectedClient || !clients || !orders) return;
    
    const client = clients.find(c => c.id === selectedClient);
    if (!client) return;

    setIsGenerating(true);
    toast({
        title: 'Generating Report...',
        description: `Fetching sales data for ${client.name}.`,
    });
    
    try {
        const clientOrders = orders.filter(o => o.clientId === client.id);

        if (clientOrders.length === 0) {
            toast({
                title: 'No Sales Found',
                description: `There are no sales records for ${client.name}.`
            });
            return;
        }

        const headers = ['Order ID', 'Order Date', 'Status', 'Total Revenue', 'Total Cost', 'Net Profit'];
        const data = clientOrders.map(order => {
            const totalCost = order.lineItems.reduce((acc, item) => 
                acc + ((item.costPrice || 0) * (item.quantity || 0)), 0
            );
            const profit = (order.subTotal || 0) - totalCost;

            return [
                order.customOrderId || order.id,
                format(order.orderDate.toDate(), 'yyyy-MM-dd'),
                order.status,
                (order.subTotal || 0).toFixed(2),
                totalCost.toFixed(2),
                profit.toFixed(2)
            ];
        });
        
        generateCSV(headers, data, `client_profit_report_${client.name.replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);

    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Report Generation Failed',
            description: 'Could not generate client report.'
        });
        console.error("Failed to generate client report:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  const isLoading = areClientsLoading || areOrdersLoading || arePurchasesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Financial Reports</h1>
      </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/10 shadow-md transition-all hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Sales & Profit Report
                    </CardTitle>
                    <CardDescription>Export all orders including Cost, Profit, and Margins.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateSalesReport} className="w-full" disabled={isGenerating || !orders || orders.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Sales P&L
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md transition-all hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      Purchases Report
                    </CardTitle>
                    <CardDescription>Download a detailed summary of all recorded vendor bills.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGeneratePurchaseReport} variant="outline" className="w-full" disabled={isGenerating || !purchases || purchases.length === 0}>
                         <Download className="mr-2 h-4 w-4" />
                        Download Purchases
                    </Button>
                </CardContent>
            </Card>

             <Card className="border-primary/10 shadow-md transition-all hover:shadow-lg lg:col-span-1">
                <CardHeader>
                    <CardTitle>Client P&L Analysis</CardTitle>
                    <CardDescription>Analyze profitability for a specific client account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select onValueChange={setSelectedClient} value={selectedClient || undefined}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients?.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleGenerateClientReport} variant="secondary" className="w-full" disabled={isGenerating || !selectedClient}>
                         <Download className="mr-2 h-4 w-4" />
                        Generate Client P&L
                    </Button>
                </CardContent>
            </Card>
        </div>
    </>
  );
}
