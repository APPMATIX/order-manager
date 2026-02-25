'use client';
import React, { useMemo, useState } from 'react';
import { doc, collection, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Search } from 'lucide-react';
import { OrderForm } from '@/components/orders/order-form';
import { OrderList } from '@/components/orders/order-list';
import type { Order, Client, Product, LineItem } from '@/lib/types';
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
import { commitBatchNonBlocking } from '@/firebase/non-blocking-updates';
import { INVOICE_TYPES, ORDER_STATUSES } from '@/lib/config';
import { Invoice } from '@/components/orders/invoice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderPriceForm } from './order-price-form';
import { Receipt } from './Receipt';
import { cn } from '@/lib/utils';

interface VendorOrdersProps {
    orders: Order[];
    clients: Client[];
    products: Product[];
}

export default function VendorOrders({ orders, clients, products }: VendorOrdersProps) {
  const [view, setView] = useState<'list' | 'form' | 'invoice' | 'price_form' | 'receipt'>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order =>
        (order.customOrderId && order.customOrderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(order => statusFilter === 'All' || order.status === statusFilter)
      .filter(order => paymentStatusFilter === 'All' || !order.paymentStatus || order.paymentStatus === paymentStatusFilter);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter]);

  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId) || null,
  [orders, selectedOrderId]);

  const orderToDelete = useMemo(() => 
    orders.find(o => o.id === orderToDeleteId) || null,
  [orders, orderToDeleteId]);

  const handleCreateOrder = () => {
    setSelectedOrderId(null);
    setView('form');
  };

  const handleCancelForm = () => {
    setView('list');
    setSelectedOrderId(null);
  };
  
  const handleViewInvoice = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('invoice');
  };
  
  const handleViewReceipt = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('receipt');
  };

  const handlePriceOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setView('price_form');
  };
  
  const handleUpdateStatus = (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => {
    if (!user || !firestore) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const batch = writeBatch(firestore);
    
    // Vendor's path
    const vendorOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    batch.update(vendorOrderRef, { [field]: newStatus });
    
    // Client's path (if registered)
    if (order.clientId && order.clientId.length > 5) {
        const clientOrderRef = doc(firestore, 'users', order.clientId, 'orders', orderId);
        batch.update(clientOrderRef, { [field]: newStatus });
    }
    
    commitBatchNonBlocking(batch, vendorOrderRef.path);
    toast({ title: "Order Updated", description: `Record updated for all participants.` });
  };

  const handleDeleteRequest = (order: Order) => {
    setOrderToDeleteId(order.id);
  };

  const confirmDelete = () => {
    if (!orderToDelete || !user) return;
    const batch = writeBatch(firestore);
    
    const vendorOrderRef = doc(firestore, 'users', user.uid, 'orders', orderToDelete.id);
    batch.delete(vendorOrderRef);
    
    if (orderToDelete.clientId && orderToDelete.clientId.length > 5) {
        const clientOrderRef = doc(firestore, 'users', orderToDelete.clientId, 'orders', orderToDelete.id);
        batch.delete(clientOrderRef);
    }
    
    commitBatchNonBlocking(batch, vendorOrderRef.path);
    setOrderToDeleteId(null);
  };

  const generateNextInvoiceId = () => {
    const highestNumericId = orders.reduce((max, o) => {
      if (!o.customOrderId) return max;
      const match = o.customOrderId.match(/\d+$/);
      const idNumber = match ? parseInt(match[0], 10) : 0;
      return idNumber > max ? idNumber : max;
    }, 0);
    const newId = (highestNumericId + 1).toString().padStart(4, '0');
    const prefix = userProfile?.invoicePrefix || 'INV-';
    return `${prefix}${newId}`;
  };

  const handlePriceFormSubmit = (data: {
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    invoiceType: typeof INVOICE_TYPES[number];
  }) => {
      if (!selectedOrder || !user) return;
      
      const invoiceId = selectedOrder.customOrderId || generateNextInvoiceId();
      
      const updateData: any = {
          ...data,
          customOrderId: invoiceId,
          status: 'Priced',
          paymentStatus: 'Unpaid'
      };

      const batch = writeBatch(firestore);
      
      const vendorOrderRef = doc(firestore, 'users', user.uid, 'orders', selectedOrder.id);
      batch.update(vendorOrderRef, updateData);
      
      if (selectedOrder.clientId && selectedOrder.clientId.length > 5) {
          const clientOrderRef = doc(firestore, 'users', selectedOrder.clientId, 'orders', selectedOrder.id);
          batch.update(clientOrderRef, updateData);
      }
      
      commitBatchNonBlocking(batch, vendorOrderRef.path);
      
      toast({ title: 'Order Priced', description: `Invoice ${invoiceId} generated and shared with client.` });
      setView('list');
      setSelectedOrderId(null);
  };

  const handleOrderSubmit = (data: any) => {
    if (!user || !clients) return;

    const client = clients.find(c => c.id === data.clientId);
    if (!client) return;
    
    const orderId = doc(collection(firestore, 'users', user.uid, 'orders')).id;
    const customOrderId = generateNextInvoiceId();

    const newOrder: any = {
      id: orderId,
      clientId: data.clientId,
      lineItems: data.lineItems,
      subTotal: data.subTotal,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      invoiceType: data.invoiceType,
      paymentMethod: data.paymentMethod,
      customOrderId,
      vendorId: user.uid,
      clientName: client.name,
      orderDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      status: 'Priced',
      paymentStatus: 'Unpaid',
    };

    if (data.deliveryDate) {
        newOrder.deliveryDate = Timestamp.fromDate(data.deliveryDate);
    }

    const batch = writeBatch(firestore);
    
    const vendorOrderRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    batch.set(vendorOrderRef, newOrder);
    
    if (client.id && client.id.length > 5) {
        const clientOrderRef = doc(firestore, 'users', client.id, 'orders', orderId);
        batch.set(clientOrderRef, newOrder);
    }

    commitBatchNonBlocking(batch, vendorOrderRef.path);
    
    toast({ title: "Order Created", description: `Direct invoice ${customOrderId} created and synced.` });
    setView('list');
  };

  const renderContent = () => {
    const clientUser = clients.find(c => c.id === selectedOrder?.clientId);

    switch(view) {
      case 'form':
        return (
          <OrderForm
            products={products || []}
            clients={clients || []}
            userProfile={userProfile}
            onSubmit={handleOrderSubmit}
            onCancel={handleCancelForm}
          />
        );
      case 'invoice':
        return selectedOrder && userProfile ? <Invoice order={selectedOrder} vendor={userProfile} client={clientUser || null} /> : null;
      case 'receipt':
        return selectedOrder && userProfile ? <Receipt order={selectedOrder} vendor={userProfile} client={clientUser || null} /> : null;
      case 'price_form':
        return selectedOrder ? <OrderPriceForm order={selectedOrder} products={products} onSubmit={handlePriceFormSubmit} onCancel={handleCancelForm} /> : null;
      case 'list':
      default:
        return filteredOrders.length > 0 ? (
          <OrderList
            orders={filteredOrders}
            userType={'vendor'}
            onView={handleViewInvoice}
            onReceipt={handleViewReceipt}
            onPrice={handlePriceOrder}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteRequest}
          />
        ) : (
           <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-[400px]">
            <Search className="h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters or creating a new order.</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className={cn("flex items-center justify-between", view !== 'list' && "no-print")}>
        <h1 className="text-lg font-semibold md:text-2xl">Transactions</h1>
         {view === 'list' && (
           <Button onClick={handleCreateOrder} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> New Direct Invoice
          </Button>
        )}
         {view !== 'list' && (
            <Button onClick={() => setView('list')} size="sm" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ledger
            </Button>
         )}
      </div>
       <Card className={(view === 'invoice' || view === 'receipt') ? 'bg-transparent shadow-none border-none' : 'mt-4 border-primary/5'}>
        <CardHeader className={cn((view === 'invoice' || view === 'receipt') ? 'hidden' : '', view !== 'list' && "no-print")}>
          <CardTitle className="text-xl font-black uppercase tracking-tight">
            {view === 'form' ? 'Manual Invoicing' : view === 'invoice' ? 'Professional Billing' : 'Business Pipeline'}
          </CardTitle>
        </CardHeader>
        <CardContent className={(view === 'invoice' || view === 'receipt') ? 'p-0' : ''}>
            {view === 'list' && (
                <div className="flex flex-col sm:flex-row gap-4 mb-4 no-print">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by ID or Client..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Fulfillment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            {ORDER_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-tight text-destructive">Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">This will permanently delete the document from both your records and the client's account history. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold uppercase text-[10px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 font-bold uppercase text-[10px]">Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}