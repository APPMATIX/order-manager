'use client';

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
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { PurchaseBill } from '@/lib/types';
import { useEffect } from 'react';

const lineItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
  costPerUnit: z.coerce.number().min(0.01, 'Cost must be positive'),
});

const purchaseBillSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  billDate: z.date({ required_error: 'Bill date is required' }),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type PurchaseBillFormValues = z.infer<typeof purchaseBillSchema>;

interface PurchaseBillFormProps {
  bill: PurchaseBill | null;
  onSubmit: (data: PurchaseBillFormValues & { totalAmount: number }) => void;
  onCancel: () => void;
}

export function PurchaseBillForm({ bill, onSubmit, onCancel }: PurchaseBillFormProps) {
  const form = useForm<PurchaseBillFormValues>({
    resolver: zodResolver(purchaseBillSchema),
    defaultValues: {
      vendorName: bill?.vendorName || '',
      billDate: bill?.billDate ? bill.billDate.toDate() : new Date(),
      lineItems: bill?.lineItems || [{ itemName: '', quantity: 1, costPerUnit: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });
  
  const watchLineItems = form.watch('lineItems');
  const totalAmount = watchLineItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.costPerUnit || 0), 0);

  const handleFormSubmit = (data: PurchaseBillFormValues) => {
    onSubmit({ ...data, totalAmount });
  };
  
  // Set totalAmount in the form state to use it on submission
  useEffect(() => {
    form.register('totalAmount');
    form.setValue('totalAmount', totalAmount);
  }, [totalAmount, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="vendorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name</FormLabel>
                <FormControl>
                  <Input placeholder="Supplier Inc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Bill Date</FormLabel>
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
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Line Items</h3>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-4 p-4 border rounded-md">
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.itemName`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Raw materials" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.costPerUnit`}
                  render={({ field }) => (
                    <FormItem className="w-32">
                      <FormLabel>Cost/Unit (AED)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="15.50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
           {form.formState.errors.lineItems && (
              <p className="text-sm font-medium text-destructive mt-2">
                {form.formState.errors.lineItems.message}
              </p>
            )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => append({ itemName: '', quantity: 1, costPerUnit: 0 })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </div>
        
        <div className="text-right text-xl font-bold">
            Total: {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalAmount)}
        </div>


        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{bill ? 'Update' : 'Save'} Bill</Button>
        </div>
      </form>
    </Form>
  );
}