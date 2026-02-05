
'use client';

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
import { Client } from '@/lib/types';
import { PAYMENT_TERMS } from '@/lib/config';
import { useCountry } from '@/context/CountryContext';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  deliveryAddress: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').optional().default(0),
  defaultPaymentTerms: z.string().optional().default(PAYMENT_TERMS[0]),
  trn: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client: Client | null;
  onSubmit: (data: ClientFormValues) => void;
  onCancel: () => void;
}

export function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const { countryConfig } = useCountry();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      contactEmail: client?.contactEmail || '',
      deliveryAddress: client?.deliveryAddress || '',
      creditLimit: client?.creditLimit || 0,
      defaultPaymentTerms: client?.defaultPaymentTerms || PAYMENT_TERMS[0],
      trn: client?.trn || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Corporation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="contact@acme.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, Anytown, USA" {...field} />
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
                <FormLabel>{countryConfig.taxIdName} ({countryConfig.taxIdLabel}) (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder={`e.g. Enter ${countryConfig.taxIdLabel}`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="creditLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Limit ({countryConfig.currencyCode}) (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultPaymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Payment Terms (Optional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{client ? 'Update' : 'Save'} Client</Button>
        </div>
      </form>
    </Form>
  );
}
