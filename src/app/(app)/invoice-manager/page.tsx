'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, Settings2, Palette, Info, Upload, Trash2, Building2 } from 'lucide-react';
import { INVOICE_TYPES } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const invoiceSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  trn: z.string().optional(),
  photoURL: z.string().optional(),
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InvoiceSettingsValues>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      companyName: '',
      address: '',
      phone: '',
      trn: '',
      photoURL: '',
      invoicePrefix: 'INV-',
      invoiceFooterNote: '',
      defaultInvoiceType: 'Normal',
    },
  });

  const watchPrefix = form.watch('invoicePrefix');
  const watchFooter = form.watch('invoiceFooterNote');
  const watchType = form.watch('defaultInvoiceType');
  const watchName = form.watch('companyName');
  const watchAddress = form.watch('address');
  const watchPhone = form.watch('phone');
  const watchTrn = form.watch('trn');
  const watchLogo = form.watch('photoURL');

  useEffect(() => {
    if (userProfile) {
      form.reset({
        companyName: userProfile.companyName || '',
        address: userProfile.address || '',
        phone: userProfile.phone || '',
        trn: userProfile.trn || '',
        photoURL: userProfile.photoURL || '',
        invoicePrefix: userProfile.invoicePrefix || 'INV-',
        invoiceFooterNote: userProfile.invoiceFooterNote || '',
        defaultInvoiceType: userProfile.defaultInvoiceType || 'Normal',
      });
    }
  }, [userProfile, form]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 512) { // 512KB limit for logo
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please upload a logo smaller than 512KB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        form.setValue('photoURL', dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: InvoiceSettingsValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, data);
      toast({
        title: 'Branding Saved',
        description: 'Your invoice identity has been updated.',
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
              Invoice Branding & Info
            </CardTitle>
            <CardDescription>
              Manage your company details and logo as they appear on documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-6 pb-4 border-b">
                  <div className="space-y-2">
                    <FormLabel>Company Logo</FormLabel>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 rounded-md border shadow-sm">
                        <AvatarImage src={watchLogo || ''} className="object-contain p-1" />
                        <AvatarFallback className="rounded-md">
                          <Building2 className="h-10 w-10 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" /> Change
                        </Button>
                        {watchLogo && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => form.setValue('photoURL', '')}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </Button>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Entity Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / TRN</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter TRN/VAT Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full address for invoice header..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+971..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoicePrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice ID Prefix</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. TAX-" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Centered at the bottom of printed documents.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Branding
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20 sticky top-6">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4" />
                Live Layout Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-white p-8 text-black shadow-inner min-h-[550px] flex flex-col scale-[0.95] origin-top">
                {/* Header Mock */}
                <div className="text-center mb-8 border-b border-gray-100 pb-4">
                  {watchLogo ? (
                    <img src={watchLogo} alt="Logo" className="mx-auto max-h-16 mb-4 object-contain" />
                  ) : (
                    <div className="mx-auto h-12 w-12 rounded border border-dashed flex items-center justify-center text-gray-300 text-[8px] mb-2">LOGO</div>
                  )}
                  <div className="font-black text-xl uppercase tracking-tighter mb-1">
                    {watchName || 'Your Company Name'}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase max-w-xs mx-auto">
                    {watchAddress || '123 Business Road, Suite 456, City, Country'}
                  </div>
                  {watchPhone && (
                    <div className="text-[10px] text-gray-500 mt-1">Tel: {watchPhone}</div>
                  )}
                  {watchTrn && (
                    <div className="text-[10px] font-bold mt-1">TRN: {watchTrn}</div>
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
                  <div className="space-y-2 px-2 opacity-30">
                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                      <div className="col-span-2">Sample Product Item</div>
                      <div className="text-center">10</div>
                      <div className="text-right">1,500.00</div>
                    </div>
                  </div>
                </div>

                {/* Footer Mock */}
                <div className="mt-auto pt-4">
                  <div className="flex justify-between items-end mb-6">
                    <div className="text-left">
                      <div className="text-[10px] font-bold">Client Signature</div>
                      <div className="h-8 w-24 border-b border-gray-200 mt-2"></div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold">Seller's Signature</div>
                      <div className="h-8 w-24 border-b border-black mt-2"></div>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed border-black pt-4 text-center">
                    <div className="text-[10px] text-gray-400 italic uppercase">
                      {watchFooter || 'NB: NO WARRANTY NO RETURN'}
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
                <p>Use a transparent PNG for your logo for the best results. The print layout is specifically calibrated for A5 landscape printers.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
