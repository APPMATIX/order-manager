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

  // Handle Dynamic Page Calibration for native browser printing
  useEffect(() => {
    if (!vendor) return;
    
    let pageSize = '210mm 297mm'; // A4
    let containerWidth = '190mm';
    let fontSize = '11pt';

    switch (vendor.invoiceLayout) {
      case 'A5':
        pageSize = '148mm 210mm';
        containerWidth = '138mm';
        fontSize = '10pt';
        break;
      case 'Letter':
        pageSize = '8.5in 11in';
        containerWidth = '7.5in';
        fontSize = '11pt';
        break;
      case 'Legal':
        pageSize = '8.5in 14in';
        containerWidth = '7.5in';
        fontSize = '11pt';
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
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('print-page-config')?.remove();
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

      {/* MODERN UI PREVIEW (Dashboard View) */}
      <Card className="no-print shadow-lg border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/5 border-b py-6 px-8 flex flex-row items-center justify-between">
          <div className="flex items-center gap-6">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Logo" className="h-16 w-16 object-contain rounded-md border bg-white p-1 shadow-sm" />
            )}
            <div>
              <CardTitle className="text-2xl font-black text-primary uppercase">
                {order.invoiceType === 'VAT' ? 'Tax Invoice' : 'Invoice'}
              </CardTitle>
              <CardDescription className="font-bold flex items-center gap-2">
                #{order.customOrderId} 
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                  {vendor.invoiceLayout || 'A5'}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-lg">{vendor.companyName}</p>
            <p className="text-sm text-muted-foreground">{order.orderDate?.toDate().toLocaleDateString()}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-8 px-8">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-primary font-black uppercase text-[10px] tracking-widest border-b pb-1">Billed To</p>
              <div>
                <p className="font-black text-base">{client?.name}</p>
                <p className="text-muted-foreground leading-relaxed">{client?.deliveryAddress}</p>
                {client?.trn && <p className="mt-2 font-bold inline-block bg-muted px-2 py-0.5 rounded text-xs">TRN: {client.trn}</p>}
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-primary font-black uppercase text-[10px] tracking-widest border-b pb-1">Seller Info</p>
              <div className="space-y-1">
                <p className="font-medium">{vendor.address}</p>
                <p className="font-medium">{vendor.phone}</p>
                <p className="font-black text-sm pt-2">Payment: {order.paymentMethod || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl overflow-hidden">
            <Table>
                <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="font-black text-primary">Description</TableHead>
                    <TableHead className="text-center font-black text-primary">Qty</TableHead>
                    <TableHead className="text-right font-black text-primary">Price</TableHead>
                    <TableHead className="text-right font-black text-primary">Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {order.lineItems.map((item, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-bold py-4">{item.productName || item.name}</TableCell>
                    <TableCell className="text-center font-medium">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right font-black">
                        {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t">
            <div className="hidden sm:block max-w-sm">
               <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total in Words</p>
               <p className="italic text-sm font-medium">{amountToWords(order.totalAmount || 0)}</p>
            </div>
            <div className="w-full sm:w-[280px] space-y-3 bg-muted/30 p-6 rounded-2xl border">
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

      {/* PROFESSIONAL BILINGUAL MODEL (Used for PDF Button and native Ctrl+P) */}
      <div className="print-visible print-container-root">
        <div className="print-container">
          {/* Header Branding */}
          <div className="text-center">
            {vendor.photoURL && (
              <img src={vendor.photoURL} alt="Logo" className="header-logo mx-auto" />
            )}
            <div className="header-title uppercase">{vendor.companyName}</div>
            <div className="header-sub">
              {vendor.address && <span>{vendor.address}</span>}
              {vendor.phone && <span> | Tel: {vendor.phone}</span>}
              {vendor.website && <span> | Website: {vendor.website}</span>}
              {vendor.trn && <div className="font-black mt-1">TRN: {vendor.trn}</div>}
            </div>
          </div>

          {/* Bilingual Title Header */}
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

          {/* Info Section */}
          <div className="info-grid">
            <div className="client-info">
              <div className="text-[9pt] font-normal mb-1 uppercase">Billed To / المشترى:</div>
              <div className="uppercase">{client?.name}</div>
              {client?.deliveryAddress && <div className="font-normal normal-case mt-1">{client.deliveryAddress}</div>}
              {client?.trn && <div className="mt-1">TRN: {client.trn}</div>}
            </div>
            <div className="order-info">
              <div className="flex items-center justify-end gap-2">
                <span>Invoice No.</span>
                <span className="ar-text">رقم الفاتورة</span>
                <span>: {order.customOrderId}</span>
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span>DATE</span>
                <span className="ar-text">التاريخ</span>
                <span>: {order.orderDate?.toDate().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Bilingual Table */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>
                  <div className="bilingual-header"><span>SL No.</span><span className="ar-text">رقم</span></div>
                </th>
                <th style={{ width: '40%' }}>
                  <div className="bilingual-header"><span>DESCRIPTION</span><span className="ar-text">الوصف</span></div>
                </th>
                <th style={{ width: '10%' }}>
                  <div className="bilingual-header"><span>UNIT</span><span className="ar-text">الوحدة</span></div>
                </th>
                <th style={{ width: '8%' }}>
                  <div className="bilingual-header"><span>QTY</span><span className="ar-text">الكمية</span></div>
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
                    <td className="uppercase font-black">{item.productName || item.name}</td>
                    <td className="text-center uppercase">{item.unit || 'PCS'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="text-right font-black">{(netAmount + vatAmount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Grid */}
          <div className="footer-section">
            <div style={{ flex: 1 }}>
              <div className="font-bold uppercase" style={{ fontSize: '9pt' }}>
                TOTAL {countryConfig.currencyCode} IN WORDS:
                <div className="font-normal mt-1 border-b border-black pb-1 italic">{amountToWords(order.totalAmount || 0)}</div>
              </div>
              <div className="mt-4">Payment Method: <span className="font-black">{order.paymentMethod || 'N/A'}</span></div>
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
              <div className="total-row grand-total">
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

          {/* Disclaimer Area */}
          <div className="footer-divider"></div>
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