
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Loader2, Search, Download } from 'lucide-react';
import { ClientForm } from '@/components/clients/client-form';
import { ClientTable } from '@/components/clients/client-table';
import type { Client, Order } from '@/lib/types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/context/UserProfileContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function ClientsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
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

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);


  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (client: Client) => {
    setClientToDelete(client);
  };

  const confirmDelete = () => {
    if (!clientToDelete || !user) return;
    const clientDoc = doc(firestore, 'users', user.uid, 'clients', clientToDelete.id);
    deleteDocumentNonBlocking(clientDoc);
    toast({ title: "Client Deleted", description: `${clientToDelete.name} has been deleted.` });
    setClientToDelete(null);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedClient(null);
  };

  const handleFormSubmit = (formData: Omit<Client, 'id' | 'createdAt'>) => {
    if (!clientsCollection || !user) return;

    if (selectedClient) {
      const clientDoc = doc(firestore, 'users', user.uid, 'clients', selectedClient.id);
      updateDocumentNonBlocking(clientDoc, formData);
    } else {
      addDocumentNonBlocking(clientsCollection, {
        ...formData,
        createdAt: serverTimestamp(),
      });
    }
    handleFormClose();
  };
  
  const downloadClientReport = () => {
    if (!filteredClients) return;
    const headers = ['Name', 'Contact Email', 'Delivery Address', 'TRN', 'Credit Limit (AED)', 'Default Payment Terms'];
    const csvContent = [
        headers.join(','),
        ...filteredClients.map(client => [
            `"${client.name.replace(/"/g, '""')}"`,
            client.contactEmail,
            `"${client.deliveryAddress.replace(/"/g, '""')}"`,
            client.trn || '',
            client.creditLimit,
            client.defaultPaymentTerms
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `client_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateClientReport = (client: Client) => {
    if (!orders) {
        toast({
            variant: 'destructive',
            title: 'Report Generation Failed',
            description: 'Order data is not yet available. Please try again in a moment.'
        });
        return;
    }

    const clientOrders = orders.filter(order => order.clientId === client.id);

    if (clientOrders.length === 0) {
        toast({
            title: 'No Sales Found',
            description: `There are no sales records for ${client.name}.`
        });
        return;
    }

    const orderHeaders = ['Order ID', 'Order Date', 'Status', 'Payment Status', 'Invoice Type', 'Subtotal (AED)', 'VAT (AED)', 'Total (AED)'];
    const lineItemHeaders = ['', 'Product Name', 'Unit', 'Quantity', 'Unit Price', 'Line Total'];

    let csvContent = `Client Sales Report for:,"${client.name.replace(/"/g, '""')}"\n`;
    csvContent += `Report Generated On:,"${format(new Date(), 'yyyy-MM-dd')}"\n\n`;

    clientOrders.forEach(order => {
        csvContent += orderHeaders.join(',') + '\n';
        const orderRow = [
            order.customOrderId || order.id,
            format((order.orderDate as Timestamp).toDate(), 'yyyy-MM-dd'),
            order.status,
            order.paymentStatus,
            order.invoiceType,
            order.subTotal.toFixed(2),
            order.vatAmount.toFixed(2),
            order.totalAmount.toFixed(2),
        ];
        csvContent += orderRow.join(',') + '\n';

        csvContent += lineItemHeaders.join(',') + '\n';
        order.lineItems.forEach(item => {
            const itemRow = [
                '', // Offset for master-detail format
                `"${item.productName.replace(/"/g, '""')}"`,
                item.unit,
                item.quantity,
                item.unitPrice.toFixed(2),
                (item.quantity * item.unitPrice).toFixed(2),
            ];
            csvContent += itemRow.join(',') + '\n';
        });
        csvContent += '\n'; // Blank line for separation
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${client.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isProfileLoading || areClientsLoading || areOrdersLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userProfile?.userType !== 'vendor') {
    return (
       <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. This area is for vendors only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }


  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Clients</h1>
          {!isFormOpen && (
             <div className="flex items-center gap-2">
                <Button onClick={downloadClientReport} variant="outline" size="sm" disabled={!filteredClients || filteredClients.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Report
                </Button>
                <Button onClick={handleAddClient} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Client
                </Button>
            </div>
          )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Manage Clients</CardTitle>
            <CardDescription>
            View, search, and manage your client information.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isFormOpen ? (
            <ClientForm
              client={selectedClient}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          ) : (
            <>
            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by name or email..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {filteredClients && filteredClients.length > 0 ? (
                <ClientTable clients={filteredClients} onEdit={handleEditClient} onDelete={handleDeleteRequest} onGenerateReport={handleGenerateClientReport} />
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Clients Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'You have not added any clients yet.'}
                </p>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client
              <span className="font-bold"> {clientToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
