'use client';
import React, { useRef, useEffect } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { amountToWords } from '@/lib/amount-to-words';
import { useCountry } from '@/context/CountryContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface InvoiceProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Invoice({ order, vendor, client }: InvoiceProps) {
  const { toast } = useToast();
  const { countryConfig, formatCurrency } = useCountry();

  useEffect(() => {
    if (!vendor) return;
    
    // Define dimensions based on layout preference
    let pageSize = '210mm 297mm'; 
    let printWidth = '190mm';
    let fontSize = '10pt';

    switch (vendor.invoiceLayout) {
      case 'A5':
        pageSize = '148mm 210mm';
        printWidth = '138mm';
        fontSize = '9pt';
        break;
      case 'Letter':
        pageSize = '8.5in 11in';
        printWidth = '7.5in';
        fontSize = '10pt';
        break;
      case 'Legal':
        pageSize = '8.5in 14in';
        printWidth = '7.5in';
        fontSize = '10pt';
        break;
      default:
        pageSize = '210mm 297mm';
        printWidth = '190mm';
        fontSize = '10pt';
    }

    const style = document.createElement('style');
    style.id = 'print-page-config';
    style.innerHTML = `
      @media print {
        @page { size: ${pageSize}; margin: 5mm; }
        .print-content-wrapper {
          width: ${printWidth} !important;
          margin: 0 auto !important;
          font-size: ${fontSize} !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById('print-page-config');
      if (el) el.remove();
    };
  }, [vendor.invoiceLayout]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    if (!client || !vendor) {
      toast({ variant: 'destructive', title: 'Cannot Send Email', description: 'Missing client or vendor info.' });
      return;
    }
    const subject = encodeURIComponent(`Invoice #${order.customOrderId} from ${vendor.companyName}`);
    const body = encodeURIComponent(`Hi ${client.name},\n\nPlease find your invoice for order #${order.customOrderId}.\nTotal: ${formatCurrency(order.totalAmount || 0)}\n\nBest regards,\n${vendor.companyName}`);
    window.location.href = `mailto:${client.contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      {/* Screen Controls */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 mb-4 print:hidden">
        <Button onClick={handleSendEmail} variant="outline" className="w-full sm:w-auto">
          <Mail className="mr-2 h-4 w-4" /> Send Email
        </Button>
        <Button onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF (Ctrl+P)
        </Button>
      </div>

      {/* Screen Preview Card */}
      <Card className="print:hidden">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-4">
             {vendor.photoURL && <img src={vendor.photoURL} alt="Logo" className="h-16 w-16 object-contain rounded border bg-white p-1 shadow-sm" />}
             <div>
                <CardTitle className="text-2xl">{order.invoiceType === 'VAT' ? 'Tax Invoice' : 'Invoice'}</CardTitle>
                <CardDescription>#{order.customOrderId} <span className="text-[10px] font-bold ml-2 text-primary border border-primary px-1 rounded uppercase">{vendor.invoiceLayout || 'A4'}</span></CardDescription>
             </div>
          </div>
          <div className="text-right">
             <p className="font-bold">{vendor.companyName}</p>
             <p className="text-sm text-muted-foreground">{order.orderDate?.toDate().toLocaleDateString()}</p>
          </div>
        </CardHeader>
        <CardContent>
           <div className="p-8 text-center text-muted-foreground border border-dashed rounded bg-muted/30">
             Professional {vendor.invoiceLayout || 'A4'} Model Preview
             <p className="text-xs mt-2 italic">Ready for standardized printing.</p>
           </div>
        </CardContent>
      </Card>

      {/* --- STRICT CSS-DRIVEN PRINT BREAKOUT --- */}
      <div className="print-breakout-root print-only">
        <div className="print-content-wrapper p-4 bg-white text-black font-sans">
          
          {/* Header */}
          <div className="text-center mb-6">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Company Logo" className="h-20 object-contain mx-auto mb-2" />
            )}
            <div className="font-bold text-2xl uppercase tracking-tight">{vendor.companyName}</div>
            <div className="text-sm opacity-80">{vendor.address}</div>
            {vendor.phone && <div className="text-sm">Tel: {vendor.phone}</div>}
            {vendor.trn && <div className="font-bold text-sm mt-1">TRN: {vendor.trn}</div>}
          </div>

          <div className="border-y-2 border-black py-2 my-6 text-center">
            <div className="font-black text-xl uppercase tracking-[0.2em]">
              {order.invoiceType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}
            </div>
          </div>

          {/* Client & Order Info */}
          <div className="flex justify-between items-start mb-8 text-sm">
            <div className="w-[55%]">
              <div className="font-bold uppercase text-[10px] text-gray-500 mb-1">Billed To</div>
              <div className="font-bold text-lg uppercase">{client?.name}</div>
              <div className="whitespace-pre-wrap leading-tight mt-1">{client?.deliveryAddress}</div>
              {client?.trn && <div className="font-bold mt-2">TRN: {client.trn}</div>}
            </div>
            <div className="w-[40%] text-right space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="font-bold uppercase text-[10px]">Invoice No:</span>
                <span className="font-mono">{order.customOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold uppercase text-[10px]">Date:</span>
                <span>{order.orderDate?.toDate().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold uppercase text-[10px]">Terms:</span>
                <span>{client?.defaultPaymentTerms || 'COD'}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse border border-black mb-6">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold border-b border-black">
                <th className="p-2 border-r border-black w-[5%] text-center">#</th>
                <th className="p-2 border-r border-black text-left">DESCRIPTION</th>
                <th className="p-2 border-r border-black w-[10%] text-center">UNIT</th>
                <th className="p-2 border-r border-black w-[10%] text-center">QTY</th>
                <th className="p-2 border-r border-black w-[15%] text-right">PRICE</th>
                <th className="p-2 w-[15%] text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(order.lineItems || []).map((item, index) => {
                const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
                return (
                  <tr key={index} className="border-b border-black last:border-0 text-[11px]">
                    <td className="p-2 border-r border-black text-center">{index + 1}</td>
                    <td className="p-2 border-r border-black font-medium uppercase">{item.productName || item.name}</td>
                    <td className="p-2 border-r border-black text-center">{item.unit || 'PCS'}</td>
                    <td className="p-2 border-r border-black text-center">{item.quantity}</td>
                    <td className="p-2 border-r border-black text-right">{formatCurrency(item.unitPrice || 0).replace(/[^\d.]/g, '')}</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(netAmount).replace(/[^\d.]/g, '')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Grid */}
          <div className="flex justify-end mb-10">
            <div className="w-[50%] text-sm">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="uppercase text-[10px] font-bold">Subtotal</span>
                <span>{formatCurrency(order.subTotal || 0)}</span>
              </div>
              {order.invoiceType === 'VAT' && (
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="uppercase text-[10px] font-bold">{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                  <span>{formatCurrency(order.vatAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-black text-lg border-b-2 border-black mt-1">
                <span className="uppercase tracking-tighter">Net Total ({countryConfig.currencyCode})</span>
                <span>{formatCurrency(order.totalAmount || 0)}</span>
              </div>
              
              <div className="mt-2 text-[10px] italic text-gray-500 text-right uppercase">
                 {amountToWords(order.totalAmount || 0)}
              </div>
            </div>
          </div>

          {/* Footer Breakout */}
          <div className="mt-auto pt-10">
            <div className="flex justify-between items-end mb-12">
               <div className="text-center">
                 <div className="h-12 w-40 border-b border-gray-300 mb-1"></div>
                 <div className="text-[9px] uppercase font-bold text-gray-400">Received By</div>
               </div>
               <div className="text-center">
                  <div className="h-12 w-48 border-b-2 border-black mb-1"></div>
                  <div className="font-bold text-[10px] uppercase">Authorized Signature</div>
                  <div className="text-[9px] text-gray-500">{vendor.companyName}</div>
               </div>
            </div>

            <div className="border-t border-dashed border-black pt-4 text-center">
              <div className="text-[10px] uppercase text-gray-600 font-medium">
                {vendor.invoiceFooterNote || 'Thank you for your business!'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}