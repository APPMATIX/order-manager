'use client';
import React, { useRef } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { amountToWords } from '@/lib/amount-to-words';

interface InvoiceProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Invoice({ order, vendor, client }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = () => {
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
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
Due Date: ${order.orderDate?.toDate().toLocaleDateString() || 'N/A'}

Thank you for your business!

Best regards,
${vendor.companyName}`
    );
    
    window.location.href = `mailto:${client.contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button onClick={handleSendEmail} variant="outline"><Mail className="mr-2 h-4 w-4" /> Send</Button>
        <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print / Save as PDF</Button>
      </div>
      <Card ref={invoiceRef} id="printable-invoice" className="p-0 sm:p-0 border-0 sm:border">
        <div className="p-4 sm:p-6 text-sm">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold">{vendor.companyName}</h1>
            {vendor.address && <p className="text-xs">{vendor.address}</p>}
            {vendor.phone && <p className="text-xs">Tel: {vendor.phone}</p>}
            {vendor.website && <p className="text-xs">Website: {vendor.website}</p>}
            {vendor.trn && <p className="text-xs font-semibold">TRN: {vendor.trn}</p>}
          </div>

          <div className="text-center mb-6 border-y-2 border-black py-1">
            <h2 className="text-lg font-bold tracking-wider">TAX INVOICE</h2>
          </div>

          {/* Client and Invoice Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="font-bold">{client?.name}</p>
              {client?.deliveryAddress && <p className="text-xs">{client.deliveryAddress}</p>}
              {client?.trn && <p className="text-xs">TRN: {client.trn}</p>}
            </div>
            <div className="text-right">
              <div className="flex justify-end gap-4">
                <span className="font-bold">INV. NO.</span>
                <span>{order.customOrderId}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="font-bold">DATE</span>
                <span>{order.orderDate?.toDate().toLocaleDateString() || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          {/* Items Table */}
          <div className="border-t border-b border-black">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-black">
                  <TableHead className="w-[40px] text-black font-bold">SL No.</TableHead>
                  <TableHead className="w-2/5 text-black font-bold">DESCRIPTION</TableHead>
                  <TableHead className="text-center text-black font-bold">UNIT</TableHead>
                  <TableHead className="text-center text-black font-bold">QTY.</TableHead>
                  <TableHead className="text-right text-black font-bold">UNIT PRICE</TableHead>
                  <TableHead className="text-right text-black font-bold">NET AMOUNT</TableHead>
                  <TableHead className="text-center text-black font-bold">VAT %</TableHead>
                  <TableHead className="text-right text-black font-bold">VAT AMOUNT</TableHead>
                  <TableHead className="text-right text-black font-bold">AMOUNT INCL. VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lineItems.map((item, index) => {
                   const netAmount = item.quantity * item.unitPrice;
                   const vatAmount = order.invoiceType === 'VAT' ? netAmount * 0.05 : 0;
                   const totalAmount = netAmount + vatAmount;
                  return (
                  <TableRow key={index} className="border-0">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-center">{item.unit}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{netAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{order.invoiceType === 'VAT' ? '5' : '0'}</TableCell>
                    <TableCell className="text-right">{vatAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
           <div className="grid grid-cols-2 mt-2">
                <div className="space-y-2">
                    <p className="text-xs uppercase">TOTAL AED: {amountToWords(order.totalAmount)}</p>
                    <div className="h-16"></div> {/* Placeholder for QR code and other info */}
                    <p className="text-xs">Receiver's Name & Sign</p>
                </div>
                <div className="space-y-px">
                     <div className="flex justify-between border-t border-b border-black py-1">
                        <span className="font-bold">NET TOTAL</span>
                        <span className="font-bold">{new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.subTotal)}</span>
                    </div>
                     {order.invoiceType === 'VAT' && (
                       <div className="flex justify-between border-b border-black py-1">
                        <span className="font-bold">VAT TOTAL</span>
                        <span className="font-bold">{new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.vatAmount)}</span>
                    </div>
                    )}
                     <div className="flex justify-between bg-gray-200 p-1">
                        <span className="font-bold">TOTAL AED</span>
                        <span className="font-bold">{new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.totalAmount)}</span>
                    </div>
                     <div className="text-right mt-8">
                        <p>For {vendor.companyName}</p>
                    </div>
                </div>
           </div>
        </div>
      </Card>
    </>
  );
}
