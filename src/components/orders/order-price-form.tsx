'use client';

import React, { useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, LineItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INVOICE_TYPES } from '@/lib/config';
import { useCountry } from '@/context/CountryContext';

const lineItemPricingSchema = z.object({
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
  onSubmit: (data: {
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    invoiceType: typeof INVOICE_TYPES[number];
  }) => void;
  onCancel: () => void;
}

export function OrderPriceForm({ order, onSubmit, onCancel }: OrderPriceFormProps) {
  const { countryConfig, formatCurrency } = useCountry();
  const form = useForm<OrderPricingFormValues>({
    resolver: zodResolver(orderPricingSchema),
    defaultValues: {
      lineItems: order.lineItems.map(item => ({
        ...item,
        unitPrice: item.unitPrice || 0,
        costPrice: item.costPrice || 0,
      })),
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
    return watchLineItems.reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0);
  }, [watchLineItems]);

  const vatAmount = useMemo(() => {
    return watchInvoiceType === 'VAT' ? subTotal * countryConfig.vatRate : 0;
  }, [subTotal, watchInvoiceType, countryConfig.vatRate]);

  const totalAmount = useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  const handleFormSubmit = (data: OrderPricingFormValues) => {
    const finalData = {
      lineItems: data.lineItems.map(item => ({
        ...item,
        total: item.quantity * (item.unitPrice || 0),
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
              Set the price for each item and choose the invoice type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price ({countryConfig.currencyCode})</TableHead>
                    <TableHead className="text-right w-40">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>{watchLineItems[index].name}</TableCell>
                      <TableCell>{watchLineItems[index].quantity}</TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          watchLineItems[index].quantity * (watchLineItems[index].unitPrice || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subTotal)}</span>
                </div>
                {watchInvoiceType === 'VAT' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold text-primary">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Submit Pricing</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
