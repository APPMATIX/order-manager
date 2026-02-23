'use client';
import React, { useMemo, useState } from 'react';
import { doc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
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
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { INVOICE_TYPES, ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/config';
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
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
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
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { [field]: newStatus });
    toast({ title: "Order Updated", description: `Updated successfully.` });
  };

  const handleDeleteRequest = (order: Order) => {
    setOrderToDeleteId(order.id);
  };

  const confirmDelete = () => {
    if (!orderToDelete || !user) return;
    const orderDocRef = doc(firestore, 'users', user.uid, 'orders', orderToDelete.id);
    deleteDocumentNonBlocking(orderDocRef);
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
      
      const updateData: any = {
          ...data,
          status: 'Priced',
          paymentStatus: 'Unpaid'
      };

      if (!selectedOrder.customOrderId) {
          updateData.customOrderId = generateNextInvoiceId();
      }

      const orderDocRef = doc(firestore, 'users', user.uid, 'orders', selectedOrder.id);
      updateDocumentNonBlocking(orderDocRef, updateData);
      
      toast({ title: 'Order Priced', description: `Invoice generated for ${selectedOrder.clientName}.` });
      setView('list');
      setSelectedOrderId(null);
  };

  const handleOrderSubmit = (data: {
    clientId: string;
    lineItems: Omit<LineItem, 'total'>[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    invoiceType: typeof INVOICE_TYPES[number];
    paymentMethod: typeof PAYMENT_METHODS[number];
    deliveryDate?: Date;
  }) => {
    if (!user || !clients) return;

    const client = clients.find(c => c.id === data.clientId);
    if (!client) return;
    
    const ordersCollection = collection(firestore, 'users', user.uid, 'orders');
    const newOrderRef = doc(ordersCollection);
    
    const customOrderId = generateNextInvoiceId();

    const newOrder: any = {
      id: newOrderRef.id,
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

    setDocumentNonBlocking(newOrderRef, newOrder, {});
    
    toast({ title: "Order Created", description: `Direct invoice created for ${client.name}.` });
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
            <h3 className="mt-4 text-lg font-semibold">No Invoices Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters or creating a new order.</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className={cn("flex items-center justify-between", view !== 'list' && "no-print")}>
        <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
         {view === 'list' && (
           <Button onClick={handleCreateOrder} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> New Direct Order
          </Button>
        )}
         {view !== 'list' && (
            <Button onClick={() => setView('list')} size="sm" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
         )}
      </div>
       <Card className={(view === 'invoice' || view === 'receipt') ? 'bg-transparent shadow-none border-none' : 'mt-4'}>
        <CardHeader className={cn((view === 'invoice' || view === 'receipt') ? 'hidden' : '', view !== 'list' && "no-print")}>
          <CardTitle>
            {view === 'form' ? 'Manual Invoice Entry' : view === 'invoice' ? 'Professional Billing' : 'Manage Pipeline'}
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
                            <SelectValue placeholder="Status" />
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
            <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription>This will remove all records for this order.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}