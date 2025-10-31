'use client';
import React, { useRef } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Card } from '@/components/ui/card';
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
    const node = invoiceRef.current;
    if (!node) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find invoice content to print.',
      });
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not open print window.',
      });
      document.body.removeChild(iframe);
      return;
    }
    
    doc.open();
    doc.write('<html><head><title>Invoice</title>');

    // Copy all style sheets from the parent document to the iframe
    Array.from(document.styleSheets).forEach(styleSheet => {
        try {
            if (styleSheet.href) {
                const link = doc.createElement('link');
                link.rel = 'stylesheet';
                link.type = styleSheet.type;
                link.href = styleSheet.href;
                doc.head.appendChild(link);
            } else {
                 const style = doc.createElement('style');
                 const cssText = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                 style.appendChild(doc.createTextNode(cssText));
                 doc.head.appendChild(style);
            }
        } catch (e) {
            console.warn('Could not read stylesheet rules. This is often due to cross-origin restrictions.', e);
        }
    });
    
    doc.write('</head><body></body></html>');
    
    // Use a small delay to ensure stylesheets are loaded before cloning the node.
    setTimeout(() => {
      const clonedNode = node.cloneNode(true);
      doc.body.appendChild(clonedNode);
      doc.close();

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Clean up after a delay
      setTimeout(() => document.body.removeChild(iframe), 1000); 
    }, 500);
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
      <div ref={invoiceRef}>
        <Card id="printable-invoice" className="p-0 sm:p-0 border-0 sm:border">
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
              <h2 className="text-lg font-bold tracking-wider">
                {order.invoiceType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}
              </h2>
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
            <table className="invoice-table">
              <thead>
                <tr>
                  <th className="sl-no-col">
                    <div className="bilingual-header">
                      <span>SL No.</span>
                      <span className="ar-text">رقم</span>
                    </div>
                  </th>
                  <th className="desc-col">
                    <div className="bilingual-header">
                      <span>DESCRIPTION</span>
                      <span className="ar-text">الوصف</span>
                    </div>
                  </th>
                  <th className="unit-col">
                    <div className="bilingual-header">
                      <span>UNIT</span>
                      <span className="ar-text">الوحدة</span>
                    </div>
                  </th>
                  <th className="qty-col">
                    <div className="bilingual-header">
                      <span>QTY.</span>
                      <span className="ar-text">الكمية</span>
                    </div>
                  </th>
                  <th className="unit-price-col">
                    <div className="bilingual-header">
                      <span>UNIT PRICE</span>
                      <span className="ar-text">سعر الوحدة</span>
                    </div>
                  </th>
                  <th className="net-amount-col">
                    <div className="bilingual-header">
                      <span>NET AMOUNT</span>
                      <span className="ar-text">المبلغ الصافي</span>
                    </div>
                  </th>
                  <th className="vat-perc-col">
                    <div className="bilingual-header">
                      <span>VAT %</span>
                      <span className="ar-text">الضريبة ٪</span>
                    </div>
                  </th>
                  <th className="vat-amount-col">
                    <div className="bilingual-header">
                      <span>VAT AMOUNT</span>
                      <span className="ar-text">مبلغ الضريبة</span>
                    </div>
                  </th>
                  <th className="total-incl-vat-col">
                    <div className="bilingual-header">
                      <span>AMOUNT INCL. VAT</span>
                      <span className="ar-text">المبلغ مع الضريبة</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((item, index) => {
                    const netAmount = item.quantity * item.unitPrice;
                    const vatAmount = order.invoiceType === 'VAT' ? netAmount * 0.05 : 0;
                    const totalAmount = netAmount + vatAmount;
                  return (
                  <tr key={index} className="invoice-table-row">
                    <td className="invoice-table-cell text-center">{index + 1}</td>
                    <td className="invoice-table-cell">{item.productName}</td>
                    <td className="invoice-table-cell text-center">{item.unit}</td>
                    <td className="invoice-table-cell text-center">{item.quantity}</td>
                    <td className="invoice-table-cell text-right">{item.unitPrice.toFixed(2)}</td>
                    <td className="invoice-table-cell text-right">{netAmount.toFixed(2)}</td>
                    <td className="invoice-table-cell text-center">{order.invoiceType === 'VAT' ? '5' : '0'}</td>
                    <td className="invoice-table-cell text-right">{vatAmount.toFixed(2)}</td>
                    <td className="invoice-table-cell text-right">{totalAmount.toFixed(2)}</td>
                  </tr>
                )})}
              </tbody>
            </table>

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
      </div>
    </>
  );
}
