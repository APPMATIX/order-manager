'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Order, Product, Client, LineItem } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

const lineItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number(),
  total: z.coerce.number(),
});

const orderSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string(),
  lineItems: z.array(lineItemSchema).min(1, 'Order must have at least one item.'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  products: Product[];
  client: Client;
  onSubmit: (data: Omit<Order, 'id' | 'createdAt' | 'customOrderId'>) => void;
  onCancel: () => void;
}

export function OrderForm({ products, client, onSubmit, onCancel }: OrderFormProps) {
  const [selectedProduct, setSelectedProduct] = useState('');

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: client.id,
      clientName: client.name,
      lineItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const watchLineItems = form.watch('lineItems');

  const totalAmount = useMemo(() => {
    return watchLineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [watchLineItems]);

  const handleAddProduct = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (product) {
      append({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
      });
      setSelectedProduct('');
    }
  };

  const handleFormSubmit = (data: OrderFormValues) => {
    const finalOrder = {
      clientId: data.clientId,
      clientName: data.clientName,
      orderDate: Timestamp.now(),
      status: 'Pending' as const,
      paymentStatus: 'Unpaid' as const,
      lineItems: data.lineItems,
      totalAmount: totalAmount,
    };
    onSubmit(finalOrder);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Order</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
             <div>
                <h3 className="text-lg font-medium">Client: {client.name}</h3>
             </div>
            <div className="space-y-2">
                <FormLabel>Order Items</FormLabel>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="w-[100px]">Quantity</TableHead>
                                <TableHead className="w-[120px]">Unit Price</TableHead>
                                <TableHead className="w-[120px]">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                                const lineItem = watchLineItems[index];
                                const total = lineItem.quantity * lineItem.unitPrice;
                                return (
                                <TableRow key={field.id}>
                                    <TableCell>{lineItem.productName}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            {...form.register(`lineItems.${index}.quantity` as const)}
                                            className="h-8"
                                            defaultValue={1}
                                        />
                                    </TableCell>
                                    <TableCell>${lineItem.unitPrice.toFixed(2)}</TableCell>
                                    <TableCell>${total.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                 {form.formState.errors.lineItems && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.lineItems.message}
                    </p>
                  )}
            </div>

            <div className="flex items-end gap-2">
                <div className="flex-grow">
                    <FormLabel>Add Product</FormLabel>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button type="button" variant="outline" onClick={handleAddProduct} disabled={!selectedProduct}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add
                </Button>
            </div>
             <div className="text-right text-xl font-bold">
                Total: ${totalAmount.toFixed(2)}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
             <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Submit Order</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
