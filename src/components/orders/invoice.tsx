'use client';
import React, { useRef } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

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
      const originalContents = document.body.innerHTML;
      const printContents = printContent.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
        {/* The download button is for show, as frontend cannot easily generate and download PDFs without a library */}
        <Button onClick={handlePrint}><Download className="mr-2 h-4 w-4" /> Download</Button>
      </div>
      <Card ref={invoiceRef} className="p-6 sm:p-8">
        <CardHeader className="p-0">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary">{vendor.companyName}</h1>
              <p className="text-muted-foreground">Invoice</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">Invoice #{order.customOrderId}</h2>
              <p className="text-sm text-muted-foreground">
                Date: {order.orderDate.toDate().toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <Separator className="my-6" />
        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Billed To:</h3>
              <address className="not-italic text-muted-foreground">
                <strong className="text-foreground">{client?.name}</strong><br />
                {client?.deliveryAddress}<br />
                {client?.contactEmail}
              </address>
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-2">From:</h3>
              <address className="not-italic text-muted-foreground">
                <strong className="text-foreground">{vendor.companyName}</strong><br />
                {vendor.email}
              </address>
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
        </CardContent>
        <Separator className="my-6" />
        <CardFooter className="p-0">
          <div className="w-full">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
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
            <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>{vendor.companyName} | {vendor.email}</p>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
