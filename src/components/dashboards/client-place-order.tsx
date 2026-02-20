'use client';
import React, { useMemo, useState, useEffect } from 'react';
import type { User, UserProfile, Product, Order, LineItem, Vendor } from '@/lib/types';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Loader2, Package, Search, ShoppingCart, Minus, Plus, CreditCard, Banknote, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { INVOICE_TYPES } from '@/lib/config';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ClientPlaceOrderProps {
    user: User;
    userProfile: UserProfile;
}

export default function ClientPlaceOrder({ user, userProfile }: ClientPlaceOrderProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<LineItem[]>([]);
    const [customItemName, setCustomItemName] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(userProfile.vendorId || null);
    const [view, setView] = useState<'catalog' | 'invoice'>('catalog');
    
    // Fulfillment States
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
    const [invoiceType, setInvoiceType] = useState<typeof INVOICE_TYPES[number]>('Normal');
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);

    const vendorsQuery = useMemoFirebase(() => collection(firestore, 'vendors'), [firestore]);
    const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

    const selectedVendorProfileQuery = useMemoFirebase(() => {
        if (!selectedVendorId) return null;
        return doc(firestore, 'users', selectedVendorId);
    }, [firestore, selectedVendorId]);
    const { data: selectedVendorProfile } = useDoc<UserProfile>(selectedVendorProfileQuery);

    useEffect(() => {
        if (selectedVendorProfile?.defaultInvoiceType) {
            setInvoiceType(selectedVendorProfile.defaultInvoiceType);
        }
    }, [selectedVendorProfile]);

    const productsQuery = useMemoFirebase(() => {
        if (!selectedVendorId) return null;
        return query(collection(firestore, 'users', selectedVendorId, 'products'));
    }, [firestore, selectedVendorId]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const filteredProducts = useMemo(() => {
        return products?.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.barcode && p.barcode.includes(searchTerm))
        ) || [];
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
                return [...currentCart, { 
                  productId: product.id, 
                  name: product.name, 
                  unit: product.unit, 
                  quantity,
                  costPrice: product.costPrice || 0
                }];
            }
            return currentCart;
        });
    };
    
    const handleAddCustomItem = () => {
        if (!customItemName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Custom item name cannot be empty.' });
            return;
        }
        setCart(currentCart => [...currentCart, { name: customItemName, quantity: 1, unit: 'Unit', costPrice: 0 }]);
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

        const ordersCollection = collection(firestore, 'users', selectedVendorId, 'orders');
        const newOrderRef = doc(ordersCollection);
        
        const newOrder: any = {
            id: newOrderRef.id,
            clientId: user.uid,
            clientName: userProfile.companyName,
            vendorId: selectedVendorId,
            status: 'Awaiting Pricing',
            lineItems: cart,
            paymentMethod: paymentMethod,
            invoiceType: invoiceType,
            createdAt: serverTimestamp(),
            orderDate: serverTimestamp(),
        };

        if (deliveryDate) {
            newOrder.deliveryDate = Timestamp.fromDate(deliveryDate);
        }

        // Synchronize client profile info to the vendor's client list
        const clientInVendorRef = doc(firestore, 'users', selectedVendorId, 'clients', user.uid);
        const syncData = {
            id: user.uid,
            name: userProfile.companyName,
            contactEmail: user.email,
            phone: userProfile.phone || '',
            deliveryAddress: userProfile.address || '',
            trn: userProfile.trn || '',
        };
        
        setDocumentNonBlocking(clientInVendorRef, syncData, { merge: true });
        setDocumentNonBlocking(newOrderRef, newOrder, {});
        
        toast({ title: 'Order Placed!', description: 'Your order has been sent to the vendor for pricing.' });
        setCart([]);
        setDeliveryDate(undefined);
    };

    const isLoading = areProductsLoading || areVendorsLoading;

    if (view === 'invoice' && selectedOrder) {
        return (
            <div className="space-y-4">
                 <Button onClick={() => setView('catalog')} variant="outline" className="no-print">Back to Ordering</Button>
                 {selectedVendorProfile ? (
                    <Invoice order={selectedOrder} vendor={selectedVendorProfile} client={userProfile} />
                 ) : (
                    <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                 )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="shadow-md border-primary/5">
                    <CardHeader>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Product Catalog</CardTitle>
                        <CardDescription>Select a vendor and browse their items to start your order.</CardDescription>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                             <Select value={selectedVendorId || undefined} onValueChange={setSelectedVendorId} disabled={areVendorsLoading}>
                                <SelectTrigger className="h-11">
                                <SelectValue placeholder={areVendorsLoading ? "Loading suppliers..." : "Select supplier"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors?.map(vendor => (
                                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search name or barcode..." className="pl-9 h-11" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={!selectedVendorId}/>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="max-h-[60vh] overflow-y-auto pt-4">
                        {isLoading && selectedVendorId ? (
                            <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : selectedVendorId ? (
                             filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                                            <div>
                                                <p className="font-bold text-sm">{product.name}</p>
                                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{product.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-background border rounded-lg p-1">
                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAddToCart(product, -1)} disabled={getCartItemQuantity(product.id) <= 0}><Minus className="h-4 w-4" /></Button>
                                                <span className="w-6 text-center font-black text-sm">{getCartItemQuantity(product.id)}</span>
                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAddToCart(product, 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Package className="mx-auto h-12 w-12 opacity-20" />
                                    <p className="mt-4 text-sm font-bold uppercase tracking-widest">No products found</p>
                                </div>
                            )
                        ) : (
                             <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl">
                                <Package className="mx-auto h-12 w-12 mb-4 opacity-10" />
                                <p className="text-sm font-black uppercase tracking-widest">Select a vendor above to begin</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-8">
                <Card className="border-primary/10 shadow-xl sticky top-24 overflow-hidden">
                    <CardHeader className="bg-primary text-primary-foreground">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-5 w-5" />
                            <CardTitle className="text-lg font-black uppercase tracking-widest">Checkout</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                         <div className="space-y-2">
                            {cart.length > 0 ? (
                                <div className="border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase">Item</TableHead>
                                                <TableHead className="text-right text-[10px] font-black">Qty</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cart.map((item, index) => (
                                                <TableRow key={item.productId || `custom-${index}`}>
                                                    <TableCell className="font-bold text-xs">{item.name}</TableCell>
                                                    <TableCell className="text-right text-xs font-black text-primary">{item.quantity} {item.unit}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your cart is empty</p>
                                </div>
                            )}
                        </div>

                         <div className="space-y-2 pt-2">
                            <div className="flex gap-2">
                                <Input placeholder="Request special item..." value={customItemName} onChange={e => setCustomItemName(e.target.value)} className="h-9 text-xs border-primary/10" />
                                <Button onClick={handleAddCustomItem} variant="secondary" size="sm" className="font-bold" disabled={!customItemName.trim()}>Add</Button>
                            </div>
                         </div>

                         <div className="space-y-5 pt-6 border-t border-dashed">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                    <Package className="h-3 w-3" />
                                    Invoicing Preference
                                </Label>
                                <Select value={invoiceType} onValueChange={(val: any) => setInvoiceType(val)}>
                                    <SelectTrigger className="h-10 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INVOICE_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>{type} Invoice</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                    <CalendarIcon className="h-3 w-3" />
                                    Requested Delivery
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-10 justify-start text-left font-bold border-primary/10",
                                                !deliveryDate && "text-muted-foreground"
                                            )}
                                        >
                                            {deliveryDate ? format(deliveryDate, "PPP") : <span className="text-xs uppercase tracking-tighter">Choose preferred date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={deliveryDate}
                                            onSelect={setDeliveryDate}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                                    <CreditCard className="h-3 w-3" />
                                    Payment Method
                                </Label>
                                <RadioGroup value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)} className="flex gap-6 pt-1">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Cash" id="cash" />
                                        <Label htmlFor="cash" className="flex items-center gap-1 cursor-pointer text-xs font-bold uppercase"><Banknote className="h-3 w-3 text-primary" /> Cash</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Card" id="card" />
                                        <Label htmlFor="card" className="flex items-center gap-1 cursor-pointer text-xs font-bold uppercase"><CreditCard className="h-3 w-3 text-primary" /> Card</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                         </div>
                    </CardContent>
                    <CardFooter className="bg-muted/10 pt-6">
                        <Button className="w-full font-black uppercase tracking-widest py-6 shadow-lg shadow-primary/20" size="lg" onClick={handlePlaceOrder} disabled={cart.length === 0 || !selectedVendorId}>
                            Submit Order for Pricing
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}