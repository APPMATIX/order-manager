
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
import { Button } from '@/components/ui/button';
import { PurchaseBill } from '@/lib/types';
import { Edit, MoreVertical, Trash2, Eye } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCountry } from '@/context/CountryContext';

interface PurchaseBillTableProps {
  bills: PurchaseBill[];
  onEdit: (bill: PurchaseBill) => void;
  onDelete: (bill: PurchaseBill) => void;
  onView: (bill: PurchaseBill) => void;
}

export function PurchaseBillTable({ bills, onEdit, onDelete, onView }: PurchaseBillTableProps) {
  const { formatCurrency } = useCountry();
  return (
    <>
        {/* Mobile View */}
        <div className="md:hidden">
            {bills.map((bill) => (
                <Card key={bill.id} className="mb-4">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{bill.vendorName}</CardTitle>
                                <CardDescription>
                                    {bill.billDate?.toDate().toLocaleDateString() || 'N/A'}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                     <DropdownMenuItem onClick={() => onView(bill)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        <span>View</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit(bill)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(bill)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(bill.subTotal)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT</span>
                            <span>{formatCurrency(bill.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span>
                                {formatCurrency(bill.totalAmount)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill Date</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>VAT</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {bills.map((bill) => (
                <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.vendorName}</TableCell>
                <TableCell>{bill.billDate?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                <TableCell>{formatCurrency(bill.subTotal)}</TableCell>
                <TableCell>{formatCurrency(bill.vatAmount)}</TableCell>
                <TableCell>
                    {formatCurrency(bill.totalAmount)}
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onView(bill)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View</span>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onEdit(bill)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(bill)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
    </>
  );
}
