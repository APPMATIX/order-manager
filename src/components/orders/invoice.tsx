'use client';
import React, { useRef } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Printer, Download, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PAYMENT_TERMS } from '@/lib/config';
import { addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface InvoiceProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Invoice({ order, vendor, client }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = () => {
    // Create a style element with print-specific styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body > *:not(.printable-invoice) {
          display: none;
        }
        .printable-invoice {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          -webkit-print-color-adjust: exact; /* Chrome, Safari */
          color-adjust: exact; /* Firefox */
        }
        /* Hide buttons in print view */
        .print-hidden {
          display: none;
        }
      }
    `;
    
    // Temporarily add the invoice section to a printable container at the root of the body
    const printContainer = document.createElement('div');
    printContainer.classList.add('printable-invoice');
    printContainer.innerHTML = invoiceRef.current?.innerHTML || '';
    
    document.head.appendChild(style);
    document.body.appendChild(printContainer);

    window.print();

    // Clean up after printing
    document.head.removeChild(style);
    document.body.removeChild(printContainer);
  };

  const handleSendEmail = () => {
    if (!client || !vendor) {
        toast({
            variant: 'destructive',
            title: 'Cannot Send Email',
            description: 'Client or vendor information is missing.'
        });
        return;
    };

    const subject = encodeURIComponent(`Invoice #${order.customOrderId} from ${vendor.companyName}`);
    const body = encodeURIComponent(
`Hi ${client.name},

Please find attached the invoice for your recent order.

Total Amount: ${new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(order.totalAmount)}
Due Date: ${getDueDate()}

Thank you for your business!

Best regards,
${vendor.companyName}`
    );
    
    window.location.href = `mailto:${client.contactEmail}?subject=${subject}&body=${body}`;
  };
  
  const getDueDate = () => {
    if (client?.defaultPaymentTerms === 'Net 30' && order.orderDate) {
      return addDays(order.orderDate.toDate(), 30).toLocaleDateString();
    }
    return order.orderDate?.toDate().toLocaleDateString() || 'N/A';
  }

  const getPaymentStatusVariant = (status: Order['paymentStatus']) => {
    switch (status) {
    case 'Unpaid': return 'destructive';
    case 'Invoiced': return 'secondary';
    case 'Paid': return 'default';
    case 'Overdue': return 'destructive';
    default: return 'secondary';
    }
  };


  return (
    <>
      <div className="flex justify-end gap-2 mb-4 print-hidden">
        <Button onClick={handleSendEmail} variant="outline"><Mail className="mr-2 h-4 w-4" /> Send</Button>
        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
        {/* The download button is for show, as frontend cannot easily generate and download PDFs without a library */}
        <Button onClick={handlePrint}><Download className="mr-2 h-4 w-4" /> Download as PDF</Button>
      </div>
      <Card className="p-6 sm:p-8 print:shadow-none print:border-none">
        <div ref={invoiceRef} className="p-4 sm:p-6" >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                    <h1 className="text-3xl font-bold text-primary">{vendor.companyName}</h1>
                    <p className="text-sm text-muted-foreground">{vendor.email}</p>
                </div>
                <div className="col-span-2 text-right">
                    <h2 className="text-2xl font-bold tracking-tight">INVOICE</h2>
                    <p className="text-sm text-muted-foreground">#{order.customOrderId}</p>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                <div>
                    <h3 className="font-semibold mb-1">Billed To</h3>
                    <address className="not-italic text-muted-foreground">
                        <strong className="text-foreground">{client?.name}</strong><br />
                        {client?.deliveryAddress}<br />
                        {client?.contactEmail}
                    </address>
                </div>
                <div className="text-right md:text-left md:col-start-4">
                     <h3 className="font-semibold mb-1">Invoice Details</h3>
                     <div className="space-y-1 text-muted-foreground">
                        <p><strong className="text-foreground">Invoice Date:</strong> {order.orderDate?.toDate().toLocaleDateString() || 'N/A'}</p>
                        <p><strong className="text-foreground">Due Date:</strong> {getDueDate()}</p>
                        <p><strong className="text-foreground">Payment Terms:</strong> {client?.defaultPaymentTerms}</p>
                     </div>
                </div>
            </div>

            <div className="mt-8">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50%]">Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.lineItems.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                        {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                        {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(item.quantity * item.unitPrice)}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>

            <Separator className="my-6" />
            
            <div className="flex flex-col sm:flex-row">
                <div className="flex-1 space-y-2 mb-4 sm:mb-0">
                   <h3 className="font-semibold">Payment Status</h3>
                   <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge>
                </div>

                <div className="w-full sm:max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(order.subTotal)}</span>
                    </div>
                    {order.invoiceType === 'VAT' && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT (5%)</span>
                        <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(order.vatAmount)}</span>
                    </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(order.totalAmount)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>{vendor.companyName} | {vendor.email}</p>
            </div>
        </div>
      </Card>
    </>
  );
}
