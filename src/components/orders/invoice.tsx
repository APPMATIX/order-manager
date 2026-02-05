'use client';
import React, { useRef } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { amountToWords } from '@/lib/amount-to-words';
import { useCountry } from '@/context/CountryContext';

interface InvoiceProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Invoice({ order, vendor, client }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { countryConfig } = useCountry();

  const handlePrint = () => {
    const invoiceElement = invoiceRef.current;
    if (!invoiceElement) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Clone all head elements from the main document to the iframe
    const headClone = document.head.cloneNode(true);
    iframeDoc.head.appendChild(headClone);
    
    // Add print-specific styles to the iframe for A5 paper (148x210mm)
    const printStyles = iframeDoc.createElement('style');
    printStyles.innerHTML = `
      @page {
        size: 148mm 210mm;
        margin: 5mm;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', sans-serif;
        width: 138mm; /* 148mm - 10mm total margin */
      }
      .print-only-invoice {
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: white !important;
      }
      .invoice-table {
        font-size: 8pt !important;
      }
      .invoice-table th, .invoice-table td {
        padding: 2pt !important;
      }
      h1 { font-size: 18pt !important; margin-bottom: 2pt !important; }
      h2 { font-size: 12pt !important; }
      p, span { font-size: 8pt !important; }
      .bilingual-header span { font-size: 7pt !important; }
      .ar-text { font-size: 7pt !important; }
    `;
    iframeDoc.head.appendChild(printStyles);

    iframeDoc.body.innerHTML = invoiceElement.innerHTML;
    // Add a class to the root element inside the iframe for print-specific overrides
    const invoiceRoot = iframeDoc.body.querySelector('.invoice-container-card');
    if(invoiceRoot) {
      invoiceRoot.classList.add('print-only-invoice');
    }
    
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
    }, 500); // A small delay to ensure all styles are loaded
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

Total Amount: ${new Intl.NumberFormat(`en-${countryConfig.code}`, { style: 'currency', currency: countryConfig.currencyCode }).format(order.totalAmount || 0)}
Due Date: ${order.orderDate?.toDate().toLocaleDateString() || 'N/A'}

Thank you for your business!

Best regards,
${vendor.companyName}`
    );
    
    window.location.href = `mailto:${client.contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4 no-print">
        <Button onClick={handleSendEmail} variant="outline"><Mail className="mr-2 h-4 w-4" /> Send</Button>
        <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print / Save as PDF</Button>
      </div>
      <div ref={invoiceRef}>
        <Card className="p-0 sm:p-0 border-0 sm:border print-content invoice-container-card">
          <div className="p-4 sm:p-6 text-sm">
            {/* Header */}
            <div className="text-center mb-4">
               <h1 className="text-3xl font-extrabold">{vendor.companyName}</h1>
              {vendor.address && <p className="text-[10px] leading-tight">{vendor.address}</p>}
              {vendor.phone && <p className="text-[10px] leading-tight">Tel: {vendor.phone}</p>}
              {vendor.website && <p className="text-[10px] leading-tight">Website: {vendor.website}</p>}
              {vendor.trn && <p className="text-[10px] font-semibold">TRN: {vendor.trn}</p>}
            </div>

            <div className="text-center mb-4 border-y border-black py-1">
              <h2 className="text-base font-bold tracking-wider">
                {order.invoiceType === 'VAT' ? `TAX INVOICE (${countryConfig.vatLabel})` : 'INVOICE'}
              </h2>
            </div>

            {/* Client and Invoice Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="font-bold text-xs">{client?.name}</p>
                {client?.deliveryAddress && <p className="text-[10px] leading-tight">{client.deliveryAddress}</p>}
                {client?.trn && <p className="text-[10px] font-bold">TRN: {client.trn}</p>}
              </div>
              <div className="text-right">
                <div className="flex justify-end gap-2 items-center">
                    <div className="bilingual-header text-right">
                        <span className="text-[9px]">Invoice No.</span>
                        <span className="ar-text text-[9px]">رقم الفاتورة</span>
                    </div>
                  <span className="text-xs">:</span>
                  <span className="text-xs font-bold">{order.customOrderId}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-xs">DATE</span>
                  <span className="text-xs">{order.orderDate?.toDate().toLocaleDateString() || 'N/A'}</span>
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
                  {order.invoiceType === 'VAT' && (
                     <>
                        <th className="vat-perc-col">
                            <div className="bilingual-header">
                            <span>{countryConfig.vatLabel} %</span>
                            <span className="ar-text">الضريبة ٪</span>
                            </div>
                        </th>
                        <th className="vat-amount-col">
                            <div className="bilingual-header">
                            <span>{countryConfig.vatLabel} AMT</span>
                            <span className="ar-text">مبلغ الضريبة</span>
                            </div>
                        </th>
                     </>
                  )}
                  <th className="total-incl-vat-col">
                    <div className="bilingual-header">
                      <span>TOTAL</span>
                      <span className="ar-text">المبلغ مع الضريبة</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(order.lineItems || []).map((item, index) => {
                    const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
                    const vatAmount = order.invoiceType === 'VAT' ? netAmount * countryConfig.vatRate : 0;
                    const totalAmount = netAmount + vatAmount;
                  return (
                  <tr key={index} className="invoice-table-row">
                    <td className="invoice-table-cell text-center">{index + 1}</td>
                    <td className="invoice-table-cell">{item.productName || item.name}</td>
                    <td className="invoice-table-cell text-center">{item.unit}</td>
                    <td className="invoice-table-cell text-center">{item.quantity}</td>
                    <td className="invoice-table-cell text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="invoice-table-cell text-right">{netAmount.toFixed(2)}</td>
                     {order.invoiceType === 'VAT' && (
                        <>
                           <td className="invoice-table-cell text-center">{(countryConfig.vatRate * 100).toFixed(0)}</td>
                           <td className="invoice-table-cell text-right">{vatAmount.toFixed(2)}</td>
                        </>
                     )}
                    <td className="invoice-table-cell text-right font-bold">{totalAmount.toFixed(2)}</td>
                  </tr>
                )})}
              </tbody>
            </table>

            {/* Totals */}
            <div className="grid grid-cols-2 mt-2 gap-4">
                  <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold">TOTAL {countryConfig.currencyCode}: {amountToWords(order.totalAmount || 0)}</p>
                      <div className="h-12 border border-dashed border-gray-300 mt-2 flex items-center justify-center text-[8px] text-muted-foreground">
                          Payment Method: {order.paymentMethod || 'N/A'}
                      </div>
                      <p className="text-[9px] mt-2">Receiver's Name & Sign</p>
                  </div>
                  <div className="space-y-px">
                      <div className="flex justify-between border-t border-b border-black py-0.5">
                          <span className="font-bold text-[10px]">NET TOTAL</span>
                          <span className="font-bold text-[10px]">{new Intl.NumberFormat(`en-${countryConfig.code}`, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.subTotal || 0)}</span>
                      </div>
                      {order.invoiceType === 'VAT' && (
                        <div className="flex justify-between border-b border-black py-0.5">
                          <span className="font-bold text-[10px]">{countryConfig.vatLabel} TOTAL</span>
                          <span className="font-bold text-[10px]">{new Intl.NumberFormat(`en-${countryConfig.code}`, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.vatAmount || 0)}</span>
                      </div>
                      )}
                      <div className="flex justify-between bg-gray-100 p-1">
                          <span className="font-bold text-[11px]">TOTAL {countryConfig.currencyCode}</span>
                          <span className="font-bold text-[11px]">{new Intl.NumberFormat(`en-${countryConfig.code}`, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(order.totalAmount || 0)}</span>
                      </div>
                      <div className="text-right mt-4">
                          <p className="text-[10px] font-bold">For {vendor.companyName}</p>
                      </div>
                  </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
