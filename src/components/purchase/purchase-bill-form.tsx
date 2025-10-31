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
import { Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { PurchaseBill } from '@/lib/types';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { extractBillDetails } from '@/ai/flows/extract-bill-details-flow';
import { Textarea } from '@/components/ui/textarea';
import { PRODUCT_UNITS } from '@/lib/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const lineItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  unit: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
  costPerUnit: z.coerce.number().min(0.01, 'Cost must be positive'),
});

const purchaseBillSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  vendorTrn: z.string().optional(),
  vendorAddress: z.string().optional(),
  vendorPhone: z.string().optional(),
  billDate: z.date({ required_error: 'Bill date is required' }),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  subTotal: z.coerce.number(),
  vatAmount: z.coerce.number(),
});

type PurchaseBillFormValues = Omit<z.infer<typeof purchaseBillSchema>, 'subTotal' | 'vatAmount'>;

interface PurchaseBillFormProps {
  bill: PurchaseBill | null;
  onSubmit: (data: z.infer<typeof purchaseBillSchema> & { totalAmount: number }) => void;
  onCancel: () => void;
}

export function PurchaseBillForm({ bill, onSubmit, onCancel }: PurchaseBillFormProps) {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<PurchaseBillFormValues>({
    resolver: zodResolver(purchaseBillSchema.omit({ subTotal: true, vatAmount: true })),
    defaultValues: {
      vendorName: bill?.vendorName || '',
      vendorTrn: bill?.vendorTrn || '',
      vendorAddress: bill?.vendorAddress || '',
      vendorPhone: bill?.vendorPhone || '',
      billDate: bill?.billDate ? bill.billDate.toDate() : new Date(),
      lineItems: bill?.lineItems || [{ itemName: '', quantity: 1, costPerUnit: 0, unit: 'PCS' }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });
  
  const watchLineItems = form.watch('lineItems');
  const [vatAmount, setVatAmount] = useState(bill?.vatAmount || 0);

  const subTotal = useMemo(() => {
    return watchLineItems.reduce((acc, item) => acc + (item.quantity || 0) * (item.costPerUnit || 0), 0);
  }, [watchLineItems]);

  const totalAmount = useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  const handleFormSubmit = (data: PurchaseBillFormValues) => {
    const dataToSubmit = {
      ...data,
      subTotal,
      vatAmount,
      totalAmount,
    };
    onSubmit(dataToSubmit);
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload an image file (e.g., PNG, JPG).',
      });
      return;
    }

    setIsScanning(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const extractedData = await extractBillDetails({ imageDataUri });
        
        form.setValue('vendorName', extractedData.vendorName);
        form.setValue('vendorTrn', extractedData.vendorTrn);
        form.setValue('vendorAddress', extractedData.vendorAddress);
        setVatAmount(extractedData.vatAmount || 0);

        try {
          const parsedDate = parseISO(extractedData.billDate);
          form.setValue('billDate', parsedDate);
        } catch (e) {
            console.warn("Could not parse date from AI, using today's date.", e);
            form.setValue('billDate', new Date());
        }

        if (extractedData.lineItems && extractedData.lineItems.length > 0) {
          replace(extractedData.lineItems.map(item => ({...item, unit: item.unit || 'PCS' })));
        } else {
            // if AI returns total but no line items, create one from totals
             if (extractedData.totalAmount && (!extractedData.lineItems || extractedData.lineItems.length === 0)) {
                const subTotalFromAi = extractedData.subTotal || (extractedData.totalAmount - (extractedData.vatAmount || 0));
                replace([{
                    itemName: 'Misc. items from scanned bill',
                    quantity: 1,
                    costPerUnit: subTotalFromAi,
                    unit: 'PCS'
                }]);
             }
        }

        toast({
          title: 'Scan Successful',
          description: 'The form has been populated with the extracted bill details.',
        });

      } catch (error) {
        console.error('Failed to extract bill details:', error);
        toast({
          variant: 'destructive',
          title: 'Scan Failed',
          description: 'Could not automatically extract details from the bill. Please fill the form manually.',
        });
      } finally {
        setIsScanning(false);
      }
    };
    reader.onerror = (error) => {
        console.error("File reading error:", error);
        toast({
            variant: 'destructive',
            title: 'File Error',
            description: 'There was an error reading the uploaded file.',
        });
        setIsScanning(false);
    };
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div className="flex justify-end mb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
        >
          {isScanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Scan className="mr-2 h-4 w-4" />
          )}
          {isScanning ? 'Scanning...' : 'Scan Bill'}
        </Button>
      </div>

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
             <FormField
              control={form.control}
              name="vendorTrn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor TRN</FormLabel>
                  <FormControl>
                    <Input placeholder="Tax Registration Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="vendorPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Vendor's phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="md:col-span-2">
                <FormField
                control={form.control}
                name="vendorAddress"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Vendor Address</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Vendor's physical address" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Line Items</h3>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto,auto,auto] items-end gap-4 p-4 border rounded-md">
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
                        name={`lineItems.${index}.unit`}
                        render={({ field }) => (
                        <FormItem className="w-24">
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {PRODUCT_UNITS.map(unit => (
                                <SelectItem key={unit} value={unit}>
                                    {unit}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
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
              onClick={() => append({ itemName: '', quantity: 1, costPerUnit: 0, unit: 'PCS' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </div>
          
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                     <span className="text-muted-foreground">VAT Amount (AED)</span>
                     <Input 
                        type="number" 
                        step="0.01"
                        value={vatAmount}
                        onChange={(e) => setVatAmount(parseFloat(e.target.value) || 0)}
                        className="w-32 h-8 text-right"
                    />
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(totalAmount)}</span>
                </div>
            </div>
          </div>


          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{bill ? 'Update' : 'Save'} Bill</Button>
          </div>
        </form>
      </Form>
    </>
  );
}
