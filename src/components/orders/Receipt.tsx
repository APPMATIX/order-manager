'use client';
import React, { useRef } from 'react';
import type { Order, UserProfile, Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, CreditCard, Banknote } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';

interface ReceiptProps {
  order: Order;
  vendor: UserProfile;
  client: Client | null;
}

export function Receipt({ order, vendor, client }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { countryConfig, formatCurrency } = useCountry();

  const handlePrint = () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print the receipt.');
        return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${order.customOrderId}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto; /* Typical thermal printer width */
                margin: 5mm;
              }
              body {
                font-family: 'monospace', sans-serif;
                font-size: 10pt;
                line-height: 1.4;
                color: #000;
                width: 100%;
              }
              .no-print {
                display: none;
              }
            }
            body {
              font-family: 'monospace', sans-serif;
              font-size: 10pt;
              line-height: 1.4;
              width: 300px; /* Emulate receipt width */
              margin: 0 auto;
              padding: 10px;
              border: 1px dashed #ccc;
            }
            .receipt-container { text-align: center; }
            .header { margin-bottom: 15px; }
            .header h1 { font-size: 1.2em; margin: 0; font-weight: bold; }
            .header p { font-size: 0.8em; margin: 2px 0; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .section { text-align: left; margin-bottom: 10px; }
            .section h2 { font-weight: bold; margin-bottom: 5px; text-align: center; font-size: 0.9em;}
            .item { display: block; margin-bottom: 5px; }
            .item .name { display: block; }
            .item .details { display: flex; justify-content: space-between; font-size: 0.9em; }
            .totals { text-align: right; }
            .totals div { display: flex; justify-content: space-between; }
            .totals .total { font-weight: bold; font-size: 1.1em; }
            .footer { text-align: center; margin-top: 15px; font-size: 0.8em; }
            .disclaimer { font-weight: bold; margin-top: 10px; font-size: 0.9em; border: 1px solid #000; padding: 2px; }
          </style>
        </head>
        <body>
          ${receiptElement.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 250);
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4 no-print">
        <Button onClick={handlePrint} className="w-full sm:w-auto"><Printer className="mr-2 h-4 w-4" /> Print Receipt</Button>
      </div>
      <div className="overflow-x-auto pb-4">
        <div ref={receiptRef} className="receipt-container mx-auto bg-white p-4 text-black border shadow-sm w-full max-w-[350px]">
            <div className="header">
            <h1>{vendor.companyName}</h1>
            {vendor.address && <p>{vendor.address}</p>}
            {vendor.phone && <p>Tel: {vendor.phone}</p>}
            {vendor.trn && <p>TRN: {vendor.trn}</p>}
            </div>

            <div className="divider"></div>

            <div className="section">
                <p><strong>Order #:</strong> {order.customOrderId}</p>
                <p><strong>Date:</strong> {order.orderDate?.toDate().toLocaleString() || 'N/A'}</p>
                <p><strong>Client:</strong> {client?.name}</p>
                {client?.trn && <p><strong>Client TRN:</strong> {client.trn}</p>}
                <p><strong>Payment:</strong> {order.paymentMethod || 'N/A'}</p>
            </div>

            <div className="divider"></div>

            <div className="section">
                <h2>ITEMS</h2>
                {order.lineItems.map((item, index) => (
                    <div key={index} className="item">
                        <span className="name">{item.productName || item.name}</span>
                        <div className="details">
                            <span>{item.quantity} {item.unit} x {formatCurrency(item.unitPrice || 0)}</span>
                            <span>{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="divider"></div>
            
            <div className="totals">
                <div>
                    <span>SUBTOTAL</span>
                    <span>{formatCurrency(order.subTotal || 0)}</span>
                </div>
                {order.invoiceType === 'VAT' && (
                    <div>
                        <span>{countryConfig.vatLabel} ({countryConfig.vatRate * 100}%)</span>
                        <span>{formatCurrency(order.vatAmount || 0)}</span>
                    </div>
                )}
                <div className="total">
                    <span>TOTAL</span>
                    <span>{formatCurrency(order.totalAmount || 0)}</span>
                </div>
            </div>
            
            <div className="divider"></div>

            <div className="footer">
                <p className="disclaimer uppercase">
                  {vendor.invoiceFooterNote || 'NB: NO WARRANTY NO RETURN'}
                </p>
                <p style={{ marginTop: '10px' }}>Thank you for your business!</p>
            </div>
        </div>
      </div>
    </>
  );
}
