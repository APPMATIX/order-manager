
'use client';
import React, { useMemo, useState } from 'react';
import type { User, UserProfile, Product, Order, LineItem, Vendor } from '@/lib/types';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Package, Search, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { OrderList } from '../orders/order-list';
import { Invoice } from '../orders/invoice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientDashboardProps {
    user: User;
    userProfile: UserProfile;
}

export default function ClientDashboard({ user, userProfile }: ClientDashboardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<LineItem[]>([]);
    const [customItemName, setCustomItemName] = useState('');
    const [view, setView] = useState<'catalog' | 'invoice'>('catalog');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

    const vendorsQuery = useMemoFirebase(() => collection(firestore, 'vendors'), [firestore]);
    const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

    const productsQuery = useMemoFirebase(() => {
        if (!selectedVendorId) return null;
        return query(collection(firestore, 'users', selectedVendorId, 'products'));
    }, [firestore, selectedVendorId]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const ordersQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'orders'), where('clientId', '==', user.uid));
    }, [firestore, user.uid]);
    const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

    const vendorQuery = useMemoFirebase(() => {
        if (!selectedVendorId) return null;
        return doc(firestore, 'users', selectedVendorId);
    }, [firestore, selectedVendorId]);

    const filteredProducts = useMemo(() => {
        return products?.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
    }, [products, searchTerm]);

    const handleAddToCart = (product: Product, quantity: number) => {
        setCart(currentCart => {
            const existingItemIndex = currentCart.findIndex(item => item.productId === product.id);
            if (existingItemIndex > -1) {
                const newCart = [...currentCart];
                const newQuantity = newCart[existingItemIndex].quantity + quantity;
                if (newQuantity <= 0) {
                    newCart.splice(existingItemIndex, 1);
                } else {
                    newCart[existingItemIndex].quantity = newQuantity;
                }
                return newCart;
            } else if (quantity > 0) {
                return [...currentCart, { productId: product.id, name: product.name, unit: product.unit, quantity }];
            }
            return currentCart;
        });
    };
    
    const handleAddCustomItem = () => {
        if (!customItemName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Custom item name cannot be empty.' });
            return;
        }
        setCart(currentCart => [...currentCart, { name: customItemName, quantity: 1, unit: 'Unit' }]);
        setCustomItemName('');
    }

    const getCartItemQuantity = (productId: string) => {
        const item = cart.find(item => item.productId === productId);
        return item ? item.quantity : 0;
    };

    const handlePlaceOrder = async () => {
        if (cart.length === 0 || !selectedVendorId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Your cart is empty or no vendor is selected.' });
            return
        };

        const ordersCollection = collection(firestore, 'orders');
        const newOrderRef = doc(ordersCollection);
        
        const newOrder: Omit<Order, 'id'> & {id: string} = {
            id: newOrderRef.id,
            clientId: user.uid,
            clientName: userProfile.companyName,
            vendorId: selectedVendorId,
            status: 'Awaiting Pricing',
            lineItems: cart,
            createdAt: serverTimestamp() as any,
            orderDate: serverTimestamp() as any,
        };

        setDocumentNonBlocking(newOrderRef, newOrder, {});
        toast({ title: 'Order Placed!', description: 'Your order has been sent to the vendor for pricing.' });
        setCart([]);
    };
    
    const handleViewInvoice = (order: Order) => {
        setSelectedOrder(order);
        setView('invoice');
    }

    const isLoading = areProductsLoading || areOrdersLoading || areVendorsLoading;

    if (view === 'invoice' && selectedOrder) {
        const vendorData = { id: selectedOrder.vendorId, userType: 'vendor', email: '', companyName: 'Loading...' };
        return (
            <div>
                 <Button onClick={() => setView('catalog')} className="mb-4">Back to Dashboard</Button>
                 <Invoice order={selectedOrder} vendor={vendorData} client={userProfile} />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Place a New Order</CardTitle>
                        <CardDescription>Browse the catalog and add items to your cart.</CardDescription>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                             <Select onValueChange={setSelectedVendorId} disabled={areVendorsLoading}>
                                <SelectTrigger>
                                <SelectValue placeholder={areVendorsLoading ? "Loading vendors..." : "Select a vendor"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors?.map(vendor => (
                                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search catalog..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={!selectedVendorId}/>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="max-h-[60vh] overflow-y-auto">
                        {isLoading && selectedVendorId ? (
                            <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : selectedVendorId ? (
                             filteredProducts.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-sm text-muted-foreground">{product.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => handleAddToCart(product, -1)} disabled={getCartItemQuantity(product.id) <= 0}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-6 text-center">{getCartItemQuantity(product.id)}</span>
                                                <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => handleAddToCart(product, 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Package className="mx-auto h-12 w-12" />
                                    <p className="mt-4">No products found for this vendor.</p>
                                </div>
                            )
                        ) : (
                             <div className="text-center py-10 text-muted-foreground">
                                <p className="mt-4">Please select a vendor to see their products.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Check the status of your recent orders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {areOrdersLoading ? (
                            <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : orders && orders.length > 0 ? (
                            <OrderList orders={orders} userType="client" onView={handleViewInvoice} />
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <ShoppingCart className="mx-auto h-12 w-12" />
                                <p className="mt-4">You haven't placed any orders yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Cart</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-2">
                            {cart.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map((item, index) => (
                                            <TableRow key={item.productId || `custom-${index}`}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Your cart is empty.</p>
                            )}
                        </div>

                         <div className="mt-4 space-y-2">
                            <div className="flex gap-2">
                                <Input placeholder="Add custom item..." value={customItemName} onChange={e => setCustomItemName(e.target.value)} />
                                <Button onClick={handleAddCustomItem} disabled={!customItemName.trim()}>Add</Button>
                            </div>
                         </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handlePlaceOrder} disabled={cart.length === 0 || !selectedVendorId}>
                            Place Order for Pricing
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
