
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
import { Loader2, Download } from 'lucide-react';
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
      let row = rowArray.map(item => (typeof item === 'string' && item.includes(',')) ? `"${item}"` : item).join(',');
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
    const headers = ['Order ID', 'Client Name', 'Order Date', 'Status', 'Payment Status', 'Subtotal', 'VAT', 'Total'];
    const data = orders.map(order => [
      order.customOrderId,
      order.clientName,
      format(order.orderDate.toDate(), 'yyyy-MM-dd'),
      order.status,
      order.paymentStatus,
      order.subTotal,
      order.vatAmount,
      order.totalAmount
    ]);
    generateCSV(headers, data, `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    setIsGenerating(false);
  };
  
  const handleGeneratePurchaseReport = () => {
     if (!purchases) return;
     setIsGenerating(true);
     const headers = ['Vendor Name', 'Bill Date', 'Subtotal', 'VAT', 'Total'];
     const data = purchases.map(p => [
        p.vendorName,
        format(p.billDate.toDate(), 'yyyy-MM-dd'),
        p.subTotal,
        p.vatAmount,
        p.totalAmount
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
        description: `Fetching sales data for ${client.name}. Please wait.`,
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

        const headers = ['Order ID', 'Order Date', 'Status', 'Total Amount'];
        const data = clientOrders.map(order => [
            order.customOrderId,
            format(order.orderDate.toDate(), 'yyyy-MM-dd'),
            order.status,
            order.totalAmount
        ]);
        
        generateCSV(headers, data, `client_report_${client.name.replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);

    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Report Generation Failed',
            description: 'Could not generate client report. Please try again.'
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
        <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
      </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Sales Report</CardTitle>
                    <CardDescription>Download a CSV of all orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateSalesReport} disabled={isGenerating || !orders || orders.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Sales
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Purchases Report</CardTitle>
                    <CardDescription>Download a CSV of all purchase bills.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGeneratePurchaseReport} disabled={isGenerating || !purchases || purchases.length === 0}>
                         <Download className="mr-2 h-4 w-4" />
                        Download Purchases
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Client Sales Report</CardTitle>
                    <CardDescription>Download a sales report for a specific client.</CardDescription>
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
                    <Button onClick={handleGenerateClientReport} disabled={isGenerating || !selectedClient}>
                         <Download className="mr-2 h-4 w-4" />
                        Download Client Report
                    </Button>
                </CardContent>
            </Card>
        </div>
    </>
  );
}
