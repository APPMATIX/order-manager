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

  // Handle Dynamic Page Calibration for BOTH standard Ctrl+P and Button
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
        @page { size: ${pageSize}; margin: 0; }
        .print-container-root { 
          width: ${containerWidth} !important; 
          font-size: ${fontSize} !important;
          margin: 0 auto !important;
          display: block !important;
        }
        /* Ensure standard browser printing hides the main UI */
        body > div:not(.print-container-root) {
          display: none !important;
        }
        .print-container-root {
          display: block !important;
          position: absolute;
          left: 0;
          top: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('print-page-config')?.remove();
    };
  }, [vendor.invoiceLayout]);

  const handlePrint = () => {
    // Simply trigger browser print, as we've optimized the global CSS for it
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
      <Card className="no-print">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-4">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Logo" className="h-16 w-16 object-contain rounded border bg-white p-1 shadow-sm" />
            )}
            <div>
              <CardTitle className="text-2xl">{order.invoiceType === 'VAT' ? 'Tax Invoice' : 'Invoice'}</CardTitle>
              <CardDescription>#{order.customOrderId} <span className="text-[10px] font-bold ml-2 text-primary border border-primary px-1 rounded uppercase">{vendor.invoiceLayout || 'A5'}</span></CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">{vendor.companyName}</p>
            <p className="text-sm text-muted-foreground">{order.orderDate?.toDate().toLocaleDateString()}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground font-medium uppercase text-xs mb-1">Billed To</p>
              <p className="font-bold">{client?.name}</p>
              <p className="text-muted-foreground">{client?.deliveryAddress}</p>
              {client?.trn && <p className="text-xs mt-1">TRN: {client.trn}</p>}
            </div>
            <div className="text-right">
              <p className="text-muted-foreground font-medium uppercase text-xs mb-1">Seller Info</p>
              <p className="text-xs">{vendor.address}</p>
              <p className="text-xs">{vendor.phone}</p>
              <p className="font-medium mt-2">Payment: {order.paymentMethod || 'N/A'}</p>
            </div>
          </div>

          <Separator />

          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {order.lineItems.map((item, i) => (
                    <TableRow key={i}>
                    <TableCell className="font-medium">{item.productName || item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-[250px] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subTotal || 0)}</span>
              </div>
              {order.invoiceType === 'VAT' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{countryConfig.vatLabel}</span>
                  <span>{formatCurrency(order.vatAmount || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center py-4 border-t border-dashed mt-4">
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-normal">
              {vendor.invoiceFooterNote || 'NB: NO WARRANTY NO RETURN'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* STRICT MODEL (Used for both Button and native Ctrl+P) */}
      <div ref={printRef} className="print-visible print-container-root">
        <div className="print-container">
          <div className="text-center">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Company Logo" className="header-logo" />
            )}
            <div className="header-title uppercase">{vendor.companyName}</div>
            {vendor.address && <div>{vendor.address}</div>}
            {vendor.phone && <div>Tel: {vendor.phone}</div>}
            {vendor.website && <div>Website: {vendor.website}</div>}
            {vendor.trn && <div className="font-bold">TRN: {vendor.trn}</div>}
          </div>

          <div className="invoice-type-header">
            <div className="invoice-type-title uppercase">
              {order.invoiceType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}
            </div>
          </div>

          <div className="info-grid">
            <div className="client-info">
              <div className="font-bold uppercase">{client?.name}</div>
              {client?.deliveryAddress && <div>{client.deliveryAddress}</div>}
              {client?.trn && <div className="font-bold">TRN: {client.trn}</div>}
            </div>
            <div className="order-info">
              <div>
                <div className="font-bold">Invoice No.</div>
                <div className="ar-text">رقم الفاتورة</div>
                <div className="font-bold">: {order.customOrderId}</div>
              </div>
              <div>
                <div className="font-bold">DATE</div>
                <div className="font-bold">: {order.orderDate?.toDate().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>
                  <div className="bilingual-header"><span>SL No.</span><span className="ar-text">رقم</span></div>
                </th>
                <th style={{ width: '35%' }}>
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
                const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
                const vatAmount = order.invoiceType === 'VAT' ? netAmount * countryConfig.vatRate : 0;
                return (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td className="uppercase">{item.productName || item.name}</td>
                    <td className="text-center uppercase">{item.unit}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="text-right">{netAmount.toFixed(2)}</td>
                    <td className="text-right font-bold">{(netAmount + vatAmount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="footer-divider"></div>

          <div className="footer-section">
            <div style={{ flex: 1 }}>
              <div className="font-bold uppercase" style={{ fontSize: '0.9em' }}>
                TOTAL {countryConfig.currencyCode}: {amountToWords(order.totalAmount || 0)}
              </div>
              <div style={{ marginTop: '5pt' }}>Payment Method: {order.paymentMethod || 'N/A'}</div>
            </div>
            <div className="totals-section">
              <div className="total-row"><span>NET TOTAL</span><span>{(order.subTotal || 0).toFixed(2)}</span></div>
              {order.invoiceType === 'VAT' && (
                <div className="total-row"><span>{countryConfig.vatLabel} TOTAL</span><span>{(order.vatAmount || 0).toDate ? '' : (order.vatAmount || 0).toFixed(2)}</span></div>
              )}
              <div className="total-row grand-total"><span>TOTAL {countryConfig.currencyCode}</span><span>{(order.totalAmount || 0).toFixed(2)}</span></div>
              
              <div className="signature-section">
                <div className="font-bold">For {vendor.companyName}</div>
                <div className="signature-line"></div>
                <div className="font-bold" style={{ fontSize: '0.85em' }}>Seller's Signature</div>
              </div>
            </div>
          </div>

          <div className="footer-divider"></div>
          <div className="disclaimer-centered uppercase">
            {vendor.invoiceFooterNote || 'NB: NO WARRANTY NO RETURN'}
          </div>
        </div>
      </div>
    </>
  );
}