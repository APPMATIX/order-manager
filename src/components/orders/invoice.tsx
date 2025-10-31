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

interface InvoiceProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Invoice({ order, vendor, client }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Invoice</title>');
        // Inject tailwind styles
        const styles = Array.from(document.styleSheets)
            .map(s => {
                try {
                    return Array.from(s.cssRules).map(r => r.cssText).join('\n');
                } catch (e) {
                    // Ignore CORS issues on external stylesheets
                    return '';
                }
            }).join('\n');
        printWindow.document.write(`<style>${styles}</style>`);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };
  
  const getDueDate = () => {
    if (client?.defaultPaymentTerms === 'Net 30') {
      return addDays(order.orderDate.toDate(), 30).toLocaleDateString();
    }
    return order.orderDate.toDate().toLocaleDateString();
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
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline"><Mail className="mr-2 h-4 w-4" /> Send</Button>
        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
        {/* The download button is for show, as frontend cannot easily generate and download PDFs without a library */}
        <Button onClick={handlePrint}><Download className="mr-2 h-4 w-4" /> Download</Button>
      </div>
      <Card ref={invoiceRef} className="p-6 sm:p-8 print:shadow-none print:border-none">
        <div className="p-4 sm:p-6" >
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
                        <p><strong className="text-foreground">Invoice Date:</strong> {order.orderDate.toDate().toLocaleDateString()}</p>
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
            
            <div className="flex">
                <div className="flex-1 space-y-2">
                   <h3 className="font-semibold">Payment Status</h3>
                   <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge>
                </div>

                <div className="w-full max-w-xs space-y-2 text-sm">
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
