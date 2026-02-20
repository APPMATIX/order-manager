'use client';

import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, LineItem, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INVOICE_TYPES } from '@/lib/config';
import { useCountry } from '@/context/CountryContext';

const lineItemPricingSchema = z.object({
  productId: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, 'Price must be zero or greater'),
  costPrice: z.coerce.number().optional(),
});

const orderPricingSchema = z.object({
  lineItems: z.array(lineItemPricingSchema),
  invoiceType: z.enum(INVOICE_TYPES),
});

type OrderPricingFormValues = z.infer<typeof orderPricingSchema>;

interface OrderPriceFormProps {
  order: Order;
  products: Product[];
  onSubmit: (data: {
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    invoiceType: typeof INVOICE_TYPES[number];
  }) => void;
  onCancel: () => void;
}

export function OrderPriceForm({ order, products, onSubmit, onCancel }: OrderPriceFormProps) {
  const { countryConfig, formatCurrency } = useCountry();
  
  const form = useForm<OrderPricingFormValues>({
    resolver: zodResolver(orderPricingSchema),
    defaultValues: {
      lineItems: order.lineItems.map(item => {
        // Find matching product in catalog to get current default price/cost
        const catalogProduct = products.find(p => p.id === item.productId);
        
        return {
          ...item,
          productId: item.productId || '',
          name: item.name || item.productName || 'Unknown Item',
          unitPrice: item.unitPrice || catalogProduct?.price || 0,
          costPrice: item.costPrice || catalogProduct?.costPrice || 0,
        };
      }),
      invoiceType: order.invoiceType || 'Normal',
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const watchLineItems = form.watch('lineItems');
  const watchInvoiceType = form.watch('invoiceType');

  const subTotal = useMemo(() => {
    return watchLineItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  }, [watchLineItems]);

  const vatAmount = useMemo(() => {
    return watchInvoiceType === 'VAT' ? subTotal * countryConfig.vatRate : 0;
  }, [subTotal, watchInvoiceType, countryConfig.vatRate]);

  const totalAmount = useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  const handleFormSubmit = (data: OrderPricingFormValues) => {
    const finalData = {
      lineItems: data.lineItems.map(item => ({
        ...item,
        total: (item.quantity || 0) * (item.unitPrice || 0),
      })),
      subTotal,
      vatAmount,
      totalAmount,
      invoiceType: data.invoiceType,
    };
    onSubmit(finalData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Price Order for {order.clientName}</CardTitle>
            <CardDescription>
              Set the price for each item. Catalog prices have been pre-filled where available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md mb-6 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24 text-center">Qty</TableHead>
                    <TableHead className="w-32">Unit Price ({countryConfig.currencyCode})</TableHead>
                    <TableHead className="text-right w-40">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">
                        {watchLineItems[index].name}
                        {watchLineItems[index].productId && (
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Catalog Match Found</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{watchLineItems[index].quantity} {watchLineItems[index].unit}</TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" className="h-8 font-bold" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right font-black">
                        {formatCurrency(
                          (watchLineItems[index].quantity || 0) * (watchLineItems[index].unitPrice || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
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
                        {INVOICE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-3 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Subtotal</span>
                  <span className="font-bold">{formatCurrency(subTotal)}</span>
                </div>
                {watchInvoiceType === 'VAT' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                    <span className="font-bold text-destructive">{formatCurrency(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-black text-primary border-t pt-3 mt-2">
                  <span className="tracking-tighter">TOTAL DUE</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pt-6 bg-muted/5 border-t mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="lg" className="px-12 font-bold">Submit Pricing</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
