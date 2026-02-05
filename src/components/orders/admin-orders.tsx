
'use client';
import React, { useMemo, useState, useEffect } from 'react';
import type { Order, UserProfile as TUserProfile, Client } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderList } from './order-list';
import { Invoice } from './invoice';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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

interface AdminOrdersProps {
  vendors: TUserProfile[];
}

export default function AdminOrders({ vendors }: AdminOrdersProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [view, setView] = useState<'list' | 'invoice'>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllOrders() {
      if (vendors.length === 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const ordersPromises = vendors.map(vendor => 
            getDocs(collection(firestore, 'users', vendor.id, 'orders'))
        );
        const ordersSnapshots = await Promise.all(ordersPromises);
        const fetchedOrders: Order[] = [];
        ordersSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
            fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
            });
        });
        setAllOrders(fetchedOrders.sort((a,b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
        }));
      } catch (error) {
          console.error("Error fetching all orders for admin:", error);
          toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to load platform orders. Please check permissions.'
          });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllOrders();
  }, [vendors, firestore, toast]);

  const filteredOrders = useMemo(() => {
    if (selectedVendorId === 'all') {
      return allOrders;
    }
    return allOrders.filter(order => order.vendorId === selectedVendorId);
  }, [allOrders, selectedVendorId]);

  const selectedVendorProfileQuery = useMemoFirebase(() => {
    if (!selectedOrder) return null;
    return doc(firestore, 'users', selectedOrder.vendorId);
  }, [firestore, selectedOrder]);
  const { data: vendorProfile } = useDoc<TUserProfile>(selectedVendorProfileQuery);
  
  const selectedClientProfileQuery = useMemoFirebase(() => {
    if (!selectedOrder) return null;
    return doc(firestore, 'users', selectedOrder.clientId);
  }, [firestore, selectedOrder]);
  const { data: clientProfile } = useDoc<Client>(selectedClientProfileQuery);


  const handleViewInvoice = (order: Order) => {
    setSelectedOrder(order);
    setView('invoice');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedOrder(null);
  };
  
  const handleUpdateStatus = (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const orderDocRef = doc(firestore, 'users', order.vendorId, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { [field]: newStatus });
    setAllOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, [field]: newStatus} : o));
    toast({ title: "Order Updated", description: `The order ${field} has been changed to ${newStatus}.` });
  };
  
  const handleDeleteRequest = (order: Order) => {
    setOrderToDelete(order);
  };

  const confirmDelete = () => {
    if (!orderToDelete) return;
    const orderDocRef = doc(firestore, 'users', orderToDelete.vendorId, 'orders', orderToDelete.id);
    deleteDocumentNonBlocking(orderDocRef);
    setAllOrders(prevOrders => prevOrders.filter(o => o.id !== orderToDelete.id));
    toast({ title: "Order Deleted", description: `Order #${orderToDelete?.customOrderId || orderToDelete?.id.substring(0,6)} has been deleted.` });
    setOrderToDelete(null);
  };

  if (view === 'invoice' && selectedOrder) {
    return (
        <div className="space-y-4">
            <Button onClick={handleBackToList} variant="outline">Back to All Orders</Button>
            {vendorProfile ? (
                <Invoice order={selectedOrder} vendor={vendorProfile} client={clientProfile} />
            ) : (
                <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            )}
        </div>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle>All Platform Orders</CardTitle>
                <CardDescription>View and filter all orders across all vendors.</CardDescription>
            </div>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Filter by vendor..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.companyName}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
             <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : filteredOrders.length > 0 ? (
          <OrderList orders={filteredOrders} userType="admin" onView={handleViewInvoice} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteRequest} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No orders found for the selected vendor.
          </div>
        )}
      </CardContent>
    </Card>
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the order
              <span className="font-bold"> #${orderToDelete?.customOrderId || orderToDelete?.id.substring(0,6)}</span>.
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
