'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings2, Palette, Info } from 'lucide-react';
import { INVOICE_TYPES } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const invoiceSettingsSchema = z.object({
  invoicePrefix: z.string().max(10, 'Prefix should be short (e.g. INV-)'),
  invoiceFooterNote: z.string().optional(),
  defaultInvoiceType: z.enum(INVOICE_TYPES),
});

type InvoiceSettingsValues = z.infer<typeof invoiceSettingsSchema>;

export default function InvoiceManagerPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvoiceSettingsValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      invoicePrefix: 'INV-',
      invoiceFooterNote: '',
      defaultInvoiceType: 'Normal',
    },
  });

  const watchPrefix = form.watch('invoicePrefix');
  const watchFooter = form.watch('invoiceFooterNote');
  const watchType = form.watch('defaultInvoiceType');

  useEffect(() => {
    if (userProfile) {
      form.reset({
        invoicePrefix: userProfile.invoicePrefix || 'INV-',
        invoiceFooterNote: userProfile.invoiceFooterNote || '',
        defaultInvoiceType: userProfile.defaultInvoiceType || 'Normal',
      });
    }
  }, [userProfile, form]);

  const onSubmit = async (data: InvoiceSettingsValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, data);
      toast({
        title: 'Settings Saved',
        description: 'Your invoice customization has been updated.',
      });
    } catch (error) {
      console.error('Failed to update invoice settings:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your changes. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userProfile?.userType !== 'vendor' && userProfile?.userType !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            This section is reserved for vendors managing their professional billing.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Invoice Manager</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Configure the default behavior and numbering for your invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="invoicePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice ID Prefix</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TAX-" {...field} />
                      </FormControl>
                      <FormDescription>
                        Appears before numeric IDs (e.g. {field.value || 'INV-'}0001).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultInvoiceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Invoice Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVOICE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Initial selection for new orders.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoiceFooterNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Footer Disclaimer</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g. NB: NO WARRANTY NO RETURN" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Personalized message at the bottom of every document.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Customizations
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4" />
                Layout Live Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Visualizing your changes on the professional document template.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-white p-8 text-black shadow-inner min-h-[400px] flex flex-col">
                {/* Header Mock */}
                <div className="text-center mb-8 border-b border-gray-100 pb-4">
                  <div className="font-black text-xl uppercase tracking-tighter mb-1">
                    {userProfile?.companyName || 'Your Company Name'}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    {userProfile?.address || 'Your Business Address'}
                  </div>
                  {userProfile?.trn && (
                    <div className="text-[10px] font-bold mt-1">TRN: {userProfile.trn}</div>
                  )}
                </div>

                {/* Type/ID Mock */}
                <div className="flex justify-between items-center mb-6 px-2">
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Document Type</div>
                    <div className="text-sm font-black">{watchType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Invoice No.</div>
                    <div className="text-sm font-black tracking-widest">{watchPrefix || 'INV-'}0001</div>
                  </div>
                </div>

                {/* Table Mock */}
                <div className="flex-1">
                  <div className="grid grid-cols-4 gap-2 border-y border-black py-1 mb-2 text-[9px] font-bold bg-gray-50 px-2 uppercase">
                    <div className="col-span-2">Description</div>
                    <div className="text-center">Qty</div>
                    <div className="text-right">Total</div>
                  </div>
                  <div className="space-y-2 px-2">
                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                      <div className="col-span-2">Sample Product Item</div>
                      <div className="text-center">10</div>
                      <div className="text-right">1,500.00</div>
                    </div>
                  </div>
                </div>

                {/* Footer Mock */}
                <div className="mt-auto pt-4 border-t border-dashed border-black">
                  <div className="flex justify-between items-end mb-4">
                    <div className="max-w-[60%]">
                      <div className="text-[8px] text-gray-400 uppercase font-bold mb-1">Disclaimer</div>
                      <div className="text-[10px] text-gray-600 leading-tight italic font-normal">
                        {watchFooter || 'NB: NO WARRANTY NO RETURN'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold">Seller's Signature</div>
                      <div className="h-10 w-32 border-b border-black mt-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200 shadow-none">
            <CardContent className="p-4 flex gap-3 items-start">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-bold">Pro Tip</p>
                <p>The print engine automatically translates standard headers to Arabic for legal compliance in UAE/GCC regions. The preview above shows the primary English layout.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
