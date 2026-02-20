'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Product } from '@/lib/types';
import { PRODUCT_UNITS } from '@/lib/config';
import { useCountry } from '@/context/CountryContext';
import { ScanBarcode, DollarSign, Tag } from 'lucide-react';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().positive('Selling price must be a positive number'),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative'),
  unit: z.enum(PRODUCT_UNITS),
  barcode: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product: Product | null;
  onSubmit: (data: ProductFormValues) => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const { countryConfig } = useCountry();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      costPrice: product?.costPrice || 0,
      unit: product?.unit || PRODUCT_UNITS[0],
      barcode: product?.barcode || '',
    },
  });

  const handleBarcodeScanned = (barcode: string) => {
    form.setValue('barcode', barcode);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Organic Avocados" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Scan or enter barcode" {...field} />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setIsScannerOpen(true)}
                      className="shrink-0"
                    >
                      <ScanBarcode className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Cost Price ({countryConfig.currencyCode})
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="1.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-primary font-bold">
                    <DollarSign className="h-3 w-3" />
                    Selling Price ({countryConfig.currencyCode})
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="2.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_UNITS.map((unit) => (
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
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{product ? 'Update' : 'Save'} Product</Button>
          </div>
        </form>
      </Form>

      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleBarcodeScanned}
        title="Register Product Barcode"
      />
    </>
  );
}
