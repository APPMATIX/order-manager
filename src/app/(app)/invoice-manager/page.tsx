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
import { Loader2, FileText, Settings2, Palette } from 'lucide-react';
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

      <div className="grid gap-6 md:grid-cols-2">
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
                        This prefix will appear before the numeric order ID (e.g. TAX-0001).
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
                        Initial selection when creating a new order.
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
                          placeholder="e.g. Goods once sold cannot be returned." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This text replaces the default "NB: NO WARRANTY NO RETURN" note.
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Layout Preview
              </CardTitle>
              <CardDescription>
                Review how your customized settings will appear on professional documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-muted/30 rounded-lg p-6 border border-dashed flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium mb-1">Professional A5 Bilingual Layout</p>
              <p className="text-xs text-muted-foreground px-4">
                The print layout is automatically optimized for standard billing. Changes to prefix and notes are reflected instantly during print or PDF generation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm">Compliance Tip</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• For UAE compliance, ensure "Tax Invoice" is selected for VAT transactions.</p>
              <p>• Your TRN and company details are pulled from your <Button variant="link" size="sm" className="p-0 h-auto underline" onClick={() => window.location.href='/profile'}>Profile Settings</Button>.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
