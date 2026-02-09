'use client';
import React, { useEffect } from 'react';
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
    
    let pageSize = '210mm 297mm'; // A4 Default
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
        .print-breakout-root { 
          width: ${containerWidth} !important; 
          font-size: ${fontSize} !important;
          margin: 0 auto !important;
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

      {/* ON-SCREEN DASHBOARD PREVIEW */}
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

      {/* THE BREAKOUT MODEL (This is what prints) */}
      <div className="print-breakout-root print-container">
        {/* Header Branding */}
        <div className="text-center">
          <div className="header-name">{vendor.companyName}</div>
          <div className="header-sub">{vendor.address}</div>
        </div>

        {/* INVOICE Label Box */}
        <div className="invoice-label-box">
          <div className="invoice-label-text">INVOICE</div>
        </div>

        {/* Info Grid */}
        <div className="meta-row">
          <div className="meta-client">
            {client?.name}
          </div>
          <div className="meta-order">
            <div>Invoice No. <span className="ar-inline">رقم الفاتورة</span> : {order.customOrderId}</div>
            <div style={{ marginTop: '2pt' }}>DATE : {order.orderDate?.toDate().toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {/* Standardized Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>
                <div className="bilingual-th"><span>SL</span><span>No.</span><span className="ar-inline">رقم</span></div>
              </th>
              <th style={{ width: '38%' }}>
                <div className="bilingual-th"><span>DESCRIPTION</span><span className="ar-inline">الوصف</span></div>
              </th>
              <th style={{ width: '10%' }}>
                <div className="bilingual-th"><span>UNIT</span><span className="ar-inline">الوحدة</span></div>
              </th>
              <th style={{ width: '8%' }}>
                <div className="bilingual-th"><span>QTY.</span><span className="ar-inline">الكمية</span></div>
              </th>
              <th style={{ width: '12%' }}>
                <div className="bilingual-th"><span>UNIT</span><span>PRICE</span><span className="ar-inline">سعر الوحدة</span></div>
              </th>
              <th style={{ width: '12%' }}>
                <div className="bilingual-th"><span>NET</span><span>AMOUNT</span><span className="ar-inline">المبلغ الصافي</span></div>
              </th>
              <th style={{ width: '14%' }}>
                <div className="bilingual-th"><span>TOTAL</span><span className="ar-inline">المبلغ مع الضريبة</span></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {(order.lineItems || []).map((item, index) => {
              const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
              const lineVat = order.invoiceType === 'VAT' ? netAmount * countryConfig.vatRate : 0;
              return (
                <tr key={index}>
                  <td className="text-center">{index + 1}</td>
                  <td className="uppercase">{item.productName || item.name}</td>
                  <td className="text-center uppercase">{item.unit || 'PCS'}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="text-right">{netAmount.toFixed(2)}</td>
                  <td className="text-right" style={{ fontWeight: 900 }}>{(netAmount + lineVat).toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Pad table if few items */}
            {Array.from({ length: Math.max(0, 10 - (order.lineItems?.length || 0)) }).map((_, i) => (
              <tr key={`pad-${i}`} style={{ height: '20pt' }}>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Footer Breakdown */}
        <div className="footer-grid">
          <div className="footer-left">
            <div className="font-bold uppercase" style={{ fontSize: '0.8em' }}>
              TOTAL {countryConfig.currencyCode}: {amountToWords(order.totalAmount || 0)}
            </div>
            <div style={{ marginTop: '10pt', fontSize: '9pt' }}>
              Payment Method: {order.paymentMethod || 'Cash'}
            </div>
          </div>
          <div className="footer-right">
            <div className="summary-row">
              <span>NET TOTAL</span>
              <span>{(order.subTotal || 0).toFixed(2)}</span>
            </div>
            <div className="summary-row bold">
              <span>TOTAL {countryConfig.currencyCode}</span>
              <span>{(order.totalAmount || 0).toFixed(2)}</span>
            </div>

            <div className="signature-area">
              <div className="font-bold">For {vendor.companyName}</div>
              <div className="signature-line"></div>
              <div className="text-[8pt] uppercase">Seller's Signature</div>
            </div>
          </div>
        </div>

        {/* Professional Bottom Disclaimer */}
        <div className="dotted-divider"></div>
        <div className="center-disclaimer">
          {vendor.invoiceFooterNote || 'NB: NO WARRANTY NO RETURN'}
        </div>
        <div className="thanks-msg">
          THANK YOU FOR YOUR BUSINESS!
        </div>
      </div>
    </>
  );
}