
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { PurchaseBill } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { useCountry } from '@/context/CountryContext';

interface PurchaseBillViewProps {
  bill: PurchaseBill | null;
}

export function PurchaseBillView({ bill }: PurchaseBillViewProps) {
  const { formatCurrency } = useCountry();

  if (!bill) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No bill selected or bill data is unavailable.</p>
      </div>
    );
  }

  const {
    vendorName,
    vendorTrn,
    vendorAddress,
    vendorPhone,
    billDate,
    lineItems,
    subTotal,
    vatAmount,
    totalAmount,
  } = bill;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex justify-between">
              <strong className="text-muted-foreground">Vendor Name:</strong>
              <span>{vendorName}</span>
            </div>
             <div className="flex justify-between">
              <strong className="text-muted-foreground">Bill Date:</strong>
              <span>{billDate?.toDate().toLocaleDateString() || 'N/A'}</span>
            </div>
            {vendorTrn && (
              <div className="flex justify-between">
                <strong className="text-muted-foreground">Vendor TRN:</strong>
                <span>{vendorTrn}</span>
              </div>
            )}
            {vendorPhone && (
              <div className="flex justify-between">
                <strong className="text-muted-foreground">Vendor Phone:</strong>
                <span>{vendorPhone}</span>
              </div>
            )}
            {vendorAddress && (
              <div className="flex justify-between md:col-span-2">
                <strong className="text-muted-foreground">Vendor Address:</strong>
                <span className="text-right">{vendorAddress}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-center">Unit</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell className="text-center">{item.unit || 'N/A'}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.costPerUnit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.quantity * item.costPerUnit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT Amount</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
