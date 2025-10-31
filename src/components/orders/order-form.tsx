'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle, Trash2, Search, Calendar as CalendarIcon, ChevronsRight, ChevronsLeft, Minus, Plus } from 'lucide-react';
import type { LineItem, Product, UserProfile, Client } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { INVOICE_TYPES, VAT_RATE } from '@/lib/config';

const lineItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  unit: z.string(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number(),
});

const orderSchema = z.object({
  clientId: z.string().min(1, { message: 'Please select a client.' }),
  deliveryDate: z.date().optional(),
  invoiceType: z.enum(INVOICE_TYPES),
  lineItems: z.array(lineItemSchema).min(1, 'Order must have at least one item.'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  products: Product[];
  clients: Client[];
  userProfile: UserProfile | null;
  onSubmit: (data: { clientId: string; lineItems: Omit<LineItem, 'total'>[]; subTotal: number; vatAmount: number; totalAmount: number; invoiceType: typeof INVOICE_TYPES[number] }) => void;
  onCancel: () => void;
}

export function OrderForm({ products, clients, userProfile, onSubmit, onCancel }: OrderFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const isVendor = userProfile?.userType === 'vendor';

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: '',
      invoiceType: 'Normal',
      lineItems: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const watchLineItems = form.watch('lineItems');
  const watchInvoiceType = form.watch('invoiceType');

  const subTotal = useMemo(() => {
    return watchLineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [watchLineItems]);

  const vatAmount = useMemo(() => {
    return watchInvoiceType === 'VAT' ? subTotal * VAT_RATE : 0;
  }, [subTotal, watchInvoiceType]);

  const totalAmount = useMemo(() => {
    return subTotal + vatAmount;
  }, [subTotal, vatAmount]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const addOrUpdateItem = (product: Product, quantity: number) => {
    const existingItemIndex = fields.findIndex(item => item.productId === product.id);
    if (existingItemIndex > -1) {
      const currentQuantity = form.getValues(`lineItems.${existingItemIndex}.quantity`);
      const newQuantity = currentQuantity + quantity;
      if (newQuantity <= 0) {
        remove(existingItemIndex);
      } else {
        update(existingItemIndex, { ...fields[existingItemIndex], quantity: newQuantity });
      }
    } else if (quantity > 0) {
      append({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: quantity,
        unitPrice: product.price,
      });
    }
  };

  const handleFormSubmit = (data: OrderFormValues) => {
    const finalOrder = {
      clientId: data.clientId as string,
      lineItems: data.lineItems.map(({productId, productName, quantity, unitPrice, unit}) => ({productId, productName, quantity, unitPrice, unit})),
      subTotal,
      vatAmount,
      totalAmount,
      invoiceType: data.invoiceType,
    };
    onSubmit(finalOrder);
  };
  
  const getLineItemQuantity = (productId: string) => {
      const item = watchLineItems.find(item => item.productId === productId);
      return item ? item.quantity : 0;
  }

  if (!isVendor) {
    return (
        <Card>
            <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
            <CardContent>
                <p>Order creation is only available for vendors.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Product Catalog</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col gap-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(product.price)} / {product.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => addOrUpdateItem(product, -1)} disabled={getLineItemQuantity(product.id) <= 0}> <Minus className="h-3 w-3" /> </Button>
                      <span>{getLineItemQuantity(product.id)}</span>
                      <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => addOrUpdateItem(product, 1)}> <Plus className="h-3 w-3" /> </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => addOrUpdateItem(product, 5)}>+5</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cart Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Your cart is empty</TableCell>
                                </TableRow>
                            ) : fields.map((field, index) => {
                                const item = watchLineItems[index];
                                const currentProduct = products.find(p => p.id === item.productId);
                                return (
                                <TableRow key={field.id}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(item.unitPrice)}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => currentProduct && addOrUpdateItem(currentProduct, -1)}> <Minus className="h-3 w-3" /> </Button>
                                        <span>{item.quantity}</span>
                                        <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => currentProduct && addOrUpdateItem(currentProduct, 1)}> <Plus className="h-3 w-3" /> </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(item.quantity * item.unitPrice)}</TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                 {form.formState.errors.lineItems && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.lineItems.message || form.formState.errors.lineItems.root?.message}
                    </p>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoiceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an invoice type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INVOICE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                 <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Delivery Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <div className="space-y-2 !mt-6 text-right">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(subTotal)}</span>
                    </div>
                     {watchInvoiceType === 'VAT' && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT ({VAT_RATE * 100}%)</span>
                            <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(vatAmount)}</span>
                        </div>
                     )}
                    <div className="flex justify-between text-2xl font-bold">
                        <span>Total</span>
                        <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalAmount)}</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={watchLineItems.length === 0 || !form.watch('clientId')}>Submit Order</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
