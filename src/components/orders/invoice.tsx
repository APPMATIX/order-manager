
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
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface InvoiceProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Invoice({ order, vendor, client }: InvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { countryConfig, formatCurrency } = useCountry();
  const firestore = useFirestore();

  // Handle Dynamic Page Calibration for standard Ctrl+P
  useEffect(() => {
    if (!vendor) return;
    
    let pageSize = '210mm 297mm'; // A4
    let containerWidth = '190mm';
    let fontSize = '10pt';

    switch (vendor.invoiceLayout) {
      case 'A5':
        pageSize = '148mm 210mm';
        containerWidth = '138mm';
        fontSize = '9pt';
        break;
      case 'Letter':
        pageSize = '8.5in 11in';
        containerWidth = '7.5in';
        fontSize = '10pt';
        break;
      case 'Legal':
        pageSize = '8.5in 14in';
        containerWidth = '7.5in';
        fontSize = '10pt';
        break;
    }

    const style = document.createElement('style');
    style.id = 'print-page-config';
    style.innerHTML = `
      @media print {
        @page { size: ${pageSize}; margin: 5mm; }
        .print-container-root { 
          width: ${containerWidth} !important; 
          font-size: ${fontSize} !important;
          margin: 0 auto !important;
          display: block !important;
          background: white !important;
          visibility: visible !important;
        }
        body { 
          background: white !important;
          -webkit-print-color-adjust: exact;
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
    // Increment print count in Firestore for analytics
    if (firestore && order.vendorId) {
      const orderDocRef = doc(firestore, 'users', order.vendorId, 'orders', order.id);
      updateDoc(orderDocRef, { printCount: increment(1) }).catch(err => {
        console.warn("Failed to increment print count", err);
      });
    }
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

  const isTaxInvoice = order.invoiceType === 'VAT';
  const isAwaitingPricing = order.status === 'Awaiting Pricing';

  // Robust calculation: Recalculate totals if they are missing or if we are in a priced state but fields are still 0
  const derivedSubTotal = order.lineItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  
  // Logic: If order is priced, use document total if it exists and is non-zero, otherwise use calculation.
  const calculatedSubTotal = (!isAwaitingPricing && order.subTotal) ? order.subTotal : derivedSubTotal;
  const calculatedVatAmount = (!isAwaitingPricing && typeof order.vatAmount === 'number') ? order.vatAmount : (isTaxInvoice ? calculatedSubTotal * countryConfig.vatRate : 0);
  const calculatedTotalAmount = (!isAwaitingPricing && order.totalAmount) ? order.totalAmount : (calculatedSubTotal + calculatedVatAmount);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-end gap-2 mb-4 no-print">
        <Button onClick={handleSendEmail} variant="outline" className="w-full sm:w-auto"><Mail className="mr-2 h-4 w-4" /> Send Email</Button>
        <Button onClick={handlePrint} className="w-full sm:w-auto"><Printer className="mr-2 h-4 w-4" /> Print / Save as PDF</Button>
      </div>

      {/* MODERN UI PREVIEW (Standard Screen View) */}
      <Card className="no-print shadow-lg border-primary/10">
        <CardHeader className="flex flex-row items-start justify-between border-b bg-muted/5">
          <div className="flex items-center gap-4">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Logo" className="h-16 w-16 object-contain rounded border bg-white p-1 shadow-sm" />
            )}
            <div>
              <CardTitle className="text-2xl font-black text-primary uppercase">
                {isTaxInvoice ? 'Tax Invoice' : 'Invoice'}
              </CardTitle>
              <CardDescription className="font-bold">
                #{order.customOrderId || order.id.substring(0, 8)} 
                <span className="text-[10px] font-bold ml-2 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                  {vendor.invoiceLayout || 'A5'}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-lg">{vendor.companyName}</p>
            <p className="text-sm text-muted-foreground font-medium">{order.orderDate?.toDate().toLocaleDateString()}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest border-b pb-1">Billed To</p>
              <div className="space-y-1">
                <p className="font-black text-base"><span className="text-muted-foreground font-normal text-xs uppercase tracking-tight">Client Name : </span>{client?.name || order.clientName}</p>
                {client?.deliveryAddress && <p className="text-muted-foreground leading-relaxed"><span className="text-muted-foreground font-normal text-xs uppercase tracking-tight">Address : </span>{client.deliveryAddress}</p>}
                {client?.phone && <p className="text-muted-foreground leading-relaxed"><span className="text-muted-foreground font-normal text-xs uppercase tracking-tight">Phone : </span>{client.phone}</p>}
                {isTaxInvoice && client?.trn && <p className="text-xs mt-2 font-bold inline-block bg-muted px-2 py-0.5 rounded">{countryConfig.taxIdLabel} : {client.trn}</p>}
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest border-b pb-1">Seller Info</p>
              <div className="space-y-1">
                <p className="font-medium">{vendor.address}</p>
                <p className="font-medium">{vendor.phone}</p>
                {vendor.email && <p className="font-medium">{vendor.email}</p>}
                {isTaxInvoice && vendor.trn && <p className="text-xs font-bold">{countryConfig.taxIdLabel} : {vendor.trn}</p>}
                <p className="font-black mt-2 pt-2 border-t">Payment : {order.paymentMethod || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold">Description</TableHead>
                    <TableHead className="text-center font-bold">Qty</TableHead>
                    <TableHead className="text-right font-bold">Price</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {order.lineItems.map((item, i) => (
                    <TableRow key={i}>
                    <TableCell className="font-medium py-4">{item.productName || item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-right">{isAwaitingPricing ? '—' : formatCurrency(item.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right font-black">
                        {isAwaitingPricing ? '—' : formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4">
            <div className="hidden sm:block max-w-sm">
               {!isAwaitingPricing && (
                 <>
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total in Words</p>
                  <p className="italic text-sm font-medium">{amountToWords(calculatedTotalAmount)}</p>
                 </>
               )}
            </div>
            <div className="w-full sm:w-[280px] space-y-3 bg-muted/20 p-6 rounded-2xl border">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-muted-foreground uppercase text-[10px]">Net Total</span>
                <span>{isAwaitingPricing ? 'Awaiting Price' : formatCurrency(calculatedSubTotal)}</span>
              </div>
              {isTaxInvoice && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground uppercase text-[10px]">{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                  <span>{isAwaitingPricing ? '—' : formatCurrency(calculatedVatAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-black text-2xl text-primary">
                <span>TOTAL</span>
                <span>{isAwaitingPricing ? '—' : formatCurrency(calculatedTotalAmount)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center py-6 border-t border-dashed mt-8">
            <p className="text-xs font-black tracking-widest uppercase opacity-60">
              {vendor.invoiceFooterNote || 'NB: NO WARRANTY NO RETURN'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* STRICT PROFESSIONAL MODEL (Triggered by browser print) */}
      <div ref={printRef} className="print-visible print-container-root">
        <div className="print-container">
          <div className="text-center">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Company Logo" className="header-logo" />
            )}
            <div className="header-title uppercase">{vendor.companyName}</div>
            <div className="header-sub" style={{ fontSize: '9pt', marginTop: '2pt' }}>
              {vendor.address && <span>{vendor.address}</span>}
              {vendor.phone && <span> | Tel: {vendor.phone}</span>}
              {vendor.email && <span> | Email: {vendor.email}</span>}
              {vendor.website && <span> | Website: {vendor.website}</span>}
              {isTaxInvoice && vendor.trn && <div className="font-bold mt-1">{countryConfig.taxIdLabel} : {vendor.trn}</div>}
            </div>
          </div>

          <div className="invoice-type-header">
            <div className="invoice-type-title">
              <div className="flex items-center justify-center gap-4">
                <span>{isTaxInvoice ? 'TAX INVOICE' : 'INVOICE'}</span>
                <span className="ar-text">{isTaxInvoice ? 'فاتورة ضريبية' : 'فاتورة'}</span>
              </div>
            </div>
          </div>

          <div className="info-grid" style={{ marginTop: '15pt' }}>
            <div className="client-info space-y-1">
              <div className="font-bold">Client Name : <span className="uppercase font-black text-[11pt]">{client?.name || order.clientName}</span></div>
              {client?.deliveryAddress && <div className="font-normal">Address : {client.deliveryAddress}</div>}
              {client?.phone && <div className="font-normal">Phone : {client.phone}</div>}
              {isTaxInvoice && client?.trn && <div className="mt-1 font-bold">{countryConfig.taxIdLabel} : {client.trn}</div>}
            </div>
            <div className="order-info">
              <div className="flex items-center justify-end gap-2">
                <span className="font-bold">Invoice No.</span>
                <span className="ar-text">رقم الفاتورة</span>
                <span className="font-black">: {order.customOrderId || order.id.substring(0, 8)}</span>
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className="font-bold">DATE</span>
                <span className="ar-text">التاريخ</span>
                <span className="font-black">: {order.orderDate?.toDate().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <table className="invoice-table" style={{ marginTop: '15pt' }}>
            <thead>
              <tr>
                <th style={{ width: '8%' }}>
                  <div className="bilingual-header"><span>SL No.</span><span className="ar-text">رقم</span></div>
                </th>
                <th style={{ width: '40%' }}>
                  <div className="bilingual-header-left"><span>DESCRIPTION</span><span className="ar-text">الوصف</span></div>
                </th>
                <th style={{ width: '10%' }}>
                  <div className="bilingual-header"><span>UNIT</span><span className="ar-text">الوحدة</span></div>
                </th>
                <th style={{ width: '8%' }}>
                  <div className="bilingual-header"><span>QTY.</span><span className="ar-text">الكمية</span></div>
                </th>
                <th style={{ width: '12%' }}>
                  <div className="bilingual-header"><span>UNIT PRICE</span><span className="ar-text">سعر الوحدة</span></div>
                </th>
                <th style={{ width: '12%' }}>
                  <div className="bilingual-header"><span>NET AMOUNT</span><span className="ar-text">المبلغ الصافي</span></div>
                </th>
                <th style={{ width: '15%' }}>
                  <div className="bilingual-header"><span>TOTAL</span><span className="ar-text">المبلغ مع الضريبة</span></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {(order.lineItems || []).map((item, index) => {
                const itemUnitPrice = isAwaitingPricing ? 0 : (item.unitPrice || 0);
                const netAmount = (item.quantity || 0) * itemUnitPrice;
                const vatAmount = isTaxInvoice ? netAmount * countryConfig.vatRate : 0;
                return (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td className="uppercase font-black text-[9pt]">{item.productName || item.name}</td>
                    <td className="text-center uppercase">{item.unit || 'PCS'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{itemUnitPrice.toFixed(2)}</td>
                    <td className="text-right">{netAmount.toFixed(2)}</td>
                    <td className="text-right font-black">{(netAmount + vatAmount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="footer-section" style={{ marginTop: '10pt' }}>
            <div style={{ flex: 1 }}>
              <div className="font-bold uppercase" style={{ fontSize: '9pt' }}>
                TOTAL {countryConfig.currencyCode}: 
                <span className="font-normal ml-2">{isAwaitingPricing ? 'AWAITING PRICING' : amountToWords(calculatedTotalAmount)}</span>
              </div>
              <div className="mt-4 font-bold">Payment Method : <span className="font-black">{order.paymentMethod || 'N/A'}</span></div>
            </div>
            <div className="totals-section">
              <div className="total-row">
                <span>NET TOTAL</span>
                <span>{calculatedSubTotal.toFixed(2)}</span>
              </div>
              <div className="total-row grand-total" style={{ borderTop: '2px solid black' }}>
                <span className="font-black">TOTAL {countryConfig.currencyCode}</span>
                <span className="font-black">{calculatedTotalAmount.toFixed(2)}</span>
              </div>
              
              <div className="signature-section">
                <div className="font-black">For {vendor.companyName}</div>
                <div className="signature-line"></div>
                <div className="font-bold text-[8pt] text-center ml-auto w-[200pt]">Seller's Signature</div>
              </div>
            </div>
          </div>

          <div className="footer-divider" style={{ marginTop: '30pt' }}></div>
          <div className="disclaimer-centered">
            {vendor.invoiceFooterNote || 'NB: NO WARRANTY NO RETURN'}
          </div>
          <div className="text-center font-bold text-[8pt] mt-4 opacity-50 uppercase tracking-widest">
            THANK YOU FOR YOUR BUSINESS!
          </div>
        </div>
      </div>
    </>
  );
}
