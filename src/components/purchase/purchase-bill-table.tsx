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
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
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

interface PurchaseBillTableProps {
  bills: PurchaseBill[];
  onEdit: (bill: PurchaseBill) => void;
  onDelete: (bill: PurchaseBill) => void;
}

export function PurchaseBillTable({ bills, onEdit, onDelete }: PurchaseBillTableProps) {
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
                    <CardContent className="text-sm">
                        <div className="flex justify-between font-bold">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span>
                                {new Intl.NumberFormat('en-AE', {
                                style: 'currency',
                                currency: 'AED',
                                }).format(bill.totalAmount)}
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
                <TableHead>Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {bills.map((bill) => (
                <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.vendorName}</TableCell>
                <TableCell>{bill.billDate?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                <TableCell>
                    {new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                    }).format(bill.totalAmount)}
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
