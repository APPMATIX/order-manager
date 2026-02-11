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
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { countryConfig, formatCurrency } = useCountry();

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
                {order.invoiceType === 'VAT' ? 'Tax Invoice' : 'Invoice'}
              </CardTitle>
              <CardDescription className="font-bold">
                #{order.customOrderId} 
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
              <div>
                <p className="font-black text-base">{client?.name}</p>
                <p className="text-muted-foreground leading-relaxed">{client?.deliveryAddress}</p>
                {client?.trn && <p className="text-xs mt-2 font-bold inline-block bg-muted px-2 py-0.5 rounded">TRN: {client.trn}</p>}
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest border-b pb-1">Seller Info</p>
              <div className="space-y-1">
                <p className="font-medium">{vendor.address}</p>
                <p className="font-medium">{vendor.phone}</p>
                <p className="font-black mt-2 pt-2 border-t">Payment: {order.paymentMethod || 'N/A'}</p>
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
                    <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right font-black">
                        {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4">
            <div className="hidden sm:block max-w-sm">
               <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total in Words</p>
               <p className="italic text-sm font-medium">{amountToWords(order.totalAmount || 0)}</p>
            </div>
            <div className="w-full sm:w-[280px] space-y-3 bg-muted/20 p-6 rounded-2xl border">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-muted-foreground uppercase text-[10px]">Net Total</span>
                <span>{formatCurrency(order.subTotal || 0)}</span>
              </div>
              {order.invoiceType === 'VAT' && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground uppercase text-[10px]">{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                  <span>{formatCurrency(order.vatAmount || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-black text-2xl text-primary">
                <span>TOTAL</span>
                <span>{formatCurrency(order.totalAmount || 0)}</span>
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
              {vendor.website && <span> | Website: {vendor.website}</span>}
              {vendor.trn && <div className="font-bold mt-1">{countryConfig.taxIdLabel}: {vendor.trn}</div>}
            </div>
          </div>

          <div className="invoice-type-header">
            <div className="invoice-type-title">
              {order.invoiceType === 'VAT' ? (
                <div className="flex items-center justify-center gap-4">
                  <span>TAX INVOICE</span>
                  <span className="ar-text">فاتورة ضريبية</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <span>INVOICE</span>
                  <span className="ar-text">فاتورة</span>
                </div>
              )}
            </div>
          </div>

          <div className="info-grid" style={{ marginTop: '15pt' }}>
            <div className="client-info">
              <div className="text-[9pt] font-normal mb-1 uppercase">Billed To / المشترى:</div>
              <div className="uppercase font-black text-[12pt]">{client?.name}</div>
              {client?.deliveryAddress && <div className="font-normal normal-case mt-1">{client.deliveryAddress}</div>}
              {client?.trn && <div className="mt-1 font-bold">{countryConfig.taxIdLabel}: {client.trn}</div>}
            </div>
            <div className="order-info">
              <div className="flex items-center justify-end gap-2">
                <span className="font-bold">Invoice No.</span>
                <span className="ar-text">رقم الفاتورة</span>
                <span className="font-black">: {order.customOrderId}</span>
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
                  <div className="bilingual-header"><span>PRICE</span><span className="ar-text">سعر الوحدة</span></div>
                </th>
                <th style={{ width: '22%' }}>
                  <div className="bilingual-header"><span>TOTAL</span><span className="ar-text">المبلغ الإجمالي</span></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {(order.lineItems || []).map((item, index) => {
                const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
                const vatAmount = order.invoiceType === 'VAT' ? netAmount * countryConfig.vatRate : 0;
                return (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td className="uppercase font-black text-[10pt]">{item.productName || item.name}</td>
                    <td className="text-center uppercase">{item.unit || 'PCS'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="text-right font-black">{(netAmount + vatAmount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="footer-section" style={{ marginTop: '10pt' }}>
            <div style={{ flex: 1 }}>
              <div className="font-bold uppercase" style={{ fontSize: '9pt' }}>
                TOTAL {countryConfig.currencyCode} IN WORDS:
                <div className="font-normal mt-1 border-b border-black pb-1 italic">{amountToWords(order.totalAmount || 0)}</div>
              </div>
              <div className="mt-4 font-bold">Payment Method: <span className="font-black">{order.paymentMethod || 'N/A'}</span></div>
            </div>
            <div className="totals-section">
              <div className="total-row">
                <span>NET TOTAL</span>
                <span>{(order.subTotal || 0).toFixed(2)}</span>
              </div>
              {order.invoiceType === 'VAT' && (
                <div className="total-row">
                  <span>{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                  <span>{(order.vatAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="total-row grand-total" style={{ borderTop: '2px solid black' }}>
                <span className="font-black">GRAND TOTAL {countryConfig.currencyCode}</span>
                <span className="font-black">{(order.totalAmount || 0).toFixed(2)}</span>
              </div>
              
              <div className="signature-section">
                <div className="font-black">For {vendor.companyName}</div>
                <div className="signature-line"></div>
                <div className="font-bold text-[8pt] text-center ml-auto w-[200pt]">Authorized Signature</div>
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