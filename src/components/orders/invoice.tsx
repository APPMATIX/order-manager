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

    const headClone = document.head.cloneNode(true);
    iframeDoc.head.appendChild(headClone);
    
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
        width: 138mm;
        background-color: white !important;
        color: black !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-only-invoice {
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: white !important;
      }
      .invoice-container-card {
        background-color: white !important;
        border: none !important;
        box-shadow: none !important;
      }
      .invoice-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt !important;
        border: 1px solid black !important;
      }
      .invoice-table th, .invoice-table td {
        border: 1px solid black !important;
        padding: 3pt !important;
      }
      .invoice-table th {
        background-color: #f8f9fa !important;
        font-weight: bold;
      }
      h1 { font-size: 20pt !important; margin-bottom: 2pt !important; font-weight: 900; }
      .bilingual-header { display: flex; flex-direction: column; line-height: 1.1; font-size: 7pt; }
      .ar-text { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; }
    `;
    iframeDoc.head.appendChild(printStyles);

    iframeDoc.body.innerHTML = invoiceElement.innerHTML;
    const invoiceRoot = iframeDoc.body.querySelector('.invoice-container-card');
    if(invoiceRoot) {
      invoiceRoot.classList.add('print-only-invoice');
    }
    
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
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

    const currencySymbol = countryConfig.currencyCode;
    const subject = encodeURIComponent(`Invoice #${order.customOrderId} from ${vendor.companyName}`);
    const body = encodeURIComponent(
`Hi ${client.name},

Please find attached the invoice for your recent order.

Total Amount: ${new Intl.NumberFormat(`en-${countryConfig.code}`, { style: 'currency', currency: countryConfig.currencyCode }).format(order.totalAmount || 0)}
Date: ${order.orderDate?.toDate().toLocaleDateString() || 'N/A'}

Thank you for your business!

Best regards,
${vendor.companyName}`
    );
    
    window.location.href = `mailto:${client.contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-end gap-2 mb-4 no-print">
        <Button onClick={handleSendEmail} variant="outline" className="w-full sm:w-auto"><Mail className="mr-2 h-4 w-4" /> Send Email</Button>
        <Button onClick={handlePrint} className="w-full sm:w-auto"><Printer className="mr-2 h-4 w-4" /> Print / Save as PDF</Button>
      </div>
      <div ref={invoiceRef}>
        <Card className="p-0 border-0 sm:border print-content invoice-container-card bg-white text-black overflow-hidden max-w-[148mm] mx-auto">
          <div className="p-6">
            {/* Header - Centered */}
            <div className="text-center mb-6 space-y-1">
               <h1 className="text-4xl font-black uppercase tracking-tighter">{vendor.companyName}</h1>
              {vendor.address && <p className="text-[10pt] leading-tight font-medium">{vendor.address}</p>}
              {vendor.phone && <p className="text-[10pt] leading-tight font-medium">Tel: {vendor.phone}</p>}
              {vendor.website && <p className="text-[10pt] leading-tight font-medium">Website: {vendor.website}</p>}
              {vendor.trn && <p className="text-[11pt] font-bold">TRN: {vendor.trn}</p>}
            </div>

            <div className="border-y-2 border-black py-1 mb-6">
              <h2 className="text-xl font-black text-center tracking-[0.3em] uppercase">
                {order.invoiceType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}
              </h2>
            </div>

            {/* Client and Invoice Info */}
            <div className="flex justify-between items-start mb-6 text-[10pt]">
              <div className="space-y-0.5">
                <p className="font-black uppercase text-base">{client?.name}</p>
                {client?.deliveryAddress && <p className="leading-tight font-medium">{client.deliveryAddress}</p>}
                {client?.trn && <p className="font-bold">TRN: {client.trn}</p>}
              </div>
              <div className="text-right space-y-1">
                <div className="flex justify-end gap-2 items-center">
                    <div className="flex flex-col items-end leading-none">
                        <span className="font-bold text-[9pt]">Invoice No.</span>
                        <span className="ar-text text-[8pt]">رقم الفاتورة</span>
                    </div>
                  <span className="font-bold">:</span>
                  <span className="font-black text-[11pt]">{order.customOrderId}</span>
                </div>
                <div className="flex justify-end gap-3">
                  <span className="font-bold">DATE</span>
                  <span className="font-medium">{order.orderDate?.toDate().toLocaleDateString() || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            {/* Items Table */}
            <div className="border border-black mb-6">
                <table className="w-full border-collapse text-[9pt]">
                <thead>
                    <tr className="bg-gray-50">
                    <th className="border border-black p-1 w-[8%]">
                        <div className="flex flex-col items-center">
                        <span className="font-bold">SL No.</span>
                        <span className="ar-text text-[7pt]">رقم</span>
                        </div>
                    </th>
                    <th className="border border-black p-1 text-left w-[35%]">
                        <div className="flex justify-between items-center px-1">
                        <span className="font-bold">DESCRIPTION</span>
                        <span className="ar-text text-[7pt]">الوصف</span>
                        </div>
                    </th>
                    <th className="border border-black p-1 w-[10%]">
                        <div className="flex flex-col items-center">
                        <span className="font-bold">UNIT</span>
                        <span className="ar-text text-[7pt]">الوحدة</span>
                        </div>
                    </th>
                    <th className="border border-black p-1 w-[8%]">
                        <div className="flex flex-col items-center">
                        <span className="font-bold">QTY.</span>
                        <span className="ar-text text-[7pt]">الكمية</span>
                        </div>
                    </th>
                    <th className="border border-black p-1 w-[12%]">
                        <div className="flex flex-col items-center">
                        <span className="font-bold">UNIT PRICE</span>
                        <span className="ar-text text-[7pt]">سعر الوحدة</span>
                        </div>
                    </th>
                    <th className="border border-black p-1 w-[12%]">
                        <div className="flex flex-col items-center">
                        <span className="font-bold">NET AMOUNT</span>
                        <span className="ar-text text-[7pt]">المبلغ الصافي</span>
                        </div>
                    </th>
                    <th className="border border-black p-1 w-[15%]">
                        <div className="flex flex-col items-center">
                        <span className="font-bold">TOTAL</span>
                        <span className="ar-text text-[7pt]">المبلغ مع الضريبة</span>
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
                    <tr key={index} className="h-8">
                        <td className="border border-black text-center">{index + 1}</td>
                        <td className="border border-black px-2 uppercase font-medium">{item.productName || item.name}</td>
                        <td className="border border-black text-center uppercase">{item.unit}</td>
                        <td className="border border-black text-center">{item.quantity}</td>
                        <td className="border border-black text-right px-2">{(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="border border-black text-right px-2">{netAmount.toFixed(2)}</td>
                        <td className="border border-black text-right px-2 font-black">{totalAmount.toFixed(2)}</td>
                    </tr>
                    )})}
                </tbody>
                </table>
            </div>

            {/* Totals and Footer */}
            <div className="flex justify-between items-start gap-8">
                  <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10pt] font-black uppercase">
                            TOTAL {countryConfig.currencyCode}: {amountToWords(order.totalAmount || 0)}
                        </p>
                      </div>
                      
                      <div className="border-2 border-dashed border-gray-300 p-4 text-center">
                          <p className="text-[10pt] font-medium">Payment Method: {order.paymentMethod || 'N/A'}</p>
                      </div>

                      <div className="border-2 border-black p-2 text-center">
                          <p className="text-[12pt] font-black tracking-widest uppercase">NB: NO WARRANTY NO RETURN</p>
                      </div>
                  </div>

                  <div className="w-[40%] space-y-3">
                      <div className="flex justify-between items-center border-b border-black pb-1">
                          <span className="font-black text-[11pt]">NET TOTAL</span>
                          <span className="font-black text-[11pt]">{new Intl.NumberFormat(`en-${countryConfig.code}`, { minimumFractionDigits: 2 }).format(order.subTotal || 0)}</span>
                      </div>
                      {order.invoiceType === 'VAT' && (
                        <div className="flex justify-between items-center border-b border-black pb-1">
                          <span className="font-black text-[11pt]">{countryConfig.vatLabel} TOTAL</span>
                          <span className="font-black text-[11pt]">{new Intl.NumberFormat(`en-${countryConfig.code}`, { minimumFractionDigits: 2 }).format(order.vatAmount || 0)}</span>
                      </div>
                      )}
                      <div className="flex justify-between items-center pt-1">
                          <span className="font-black text-[13pt]">TOTAL {countryConfig.currencyCode}</span>
                          <span className="font-black text-[13pt]">{new Intl.NumberFormat(`en-${countryConfig.code}`, { minimumFractionDigits: 2 }).format(order.totalAmount || 0)}</span>
                      </div>

                      <div className="text-right pt-8">
                          <p className="text-[11pt] font-black">For {vendor.companyName}</p>
                          <div className="mt-12 border-t border-black inline-block w-full"></div>
                          <p className="text-[9pt] font-bold mt-1">Seller's Signature</p>
                      </div>
                  </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
