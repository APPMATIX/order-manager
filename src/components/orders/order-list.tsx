
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Eye, MoreVertical, Trash2 } from 'lucide-react';
import type { Order, UserProfile } from '@/lib/types';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/config';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

interface OrderListProps {
  orders: Order[];
  userType: UserProfile['userType'];
  onView: (order: Order) => void;
  onUpdateStatus: (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => void;
  onDelete: (order: Order) => void;
}

const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'secondary';
      case 'Accepted': return 'default';
      case 'In Transit': return 'outline';
      case 'Delivered': return 'default';
      default: return 'secondary';
    }
};

const getPaymentStatusVariant = (status: Order['paymentStatus']) => {
    switch (status) {
    case 'Unpaid': return 'destructive';
    case 'Invoiced': return 'secondary';
    case 'Paid': return 'default';
    case 'Overdue': return 'destructive';
    default: return 'secondary';
    }
};


export function OrderList({ orders, userType, onView, onUpdateStatus, onDelete }: OrderListProps) {

  const VendorActions = ({ order }: { order: Order }) => (
     <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(order)}>
                <Eye className="mr-2 h-4 w-4" />
                View Invoice
            </DropdownMenuItem>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {ORDER_STATUSES.map(status => (
                            <DropdownMenuItem key={status} onClick={() => onUpdateStatus(order.id, 'status', status)}>
                                {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>Update Payment</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {PAYMENT_STATUSES.map(status => (
                            <DropdownMenuItem key={status} onClick={() => onUpdateStatus(order.id, 'paymentStatus', status)}>
                                {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(order)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Order
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
        {/* Mobile View */}
        <div className="md:hidden">
        {orders.map((order) => (
          <Card key={order.id} className="mb-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">#{order.customOrderId || order.id.substring(0, 6)}</CardTitle>
                  {userType === 'vendor' && <CardDescription>{order.clientName}</CardDescription>}
                </div>
                {userType === 'vendor' ? <VendorActions order={order} /> : (
                     <Button variant="ghost" size="icon" onClick={() => onView(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{order.orderDate?.toDate().toLocaleDateString() || 'N/A'}</span>
              </div>
               <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(order.totalAmount)}
                  </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge>
              </div>
               <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invoice</span>
                 <Badge variant={order.invoiceType === 'VAT' ? 'outline' : 'secondary'}>
                  {order.invoiceType}
                </Badge>
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
                <TableHead>Order ID</TableHead>
                {userType === 'vendor' && <TableHead>Client</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Invoice Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                { (userType === 'vendor') && <TableHead className="text-right">Actions</TableHead> }
            </TableRow>
            </TableHeader>
            <TableBody>
            {orders.map((order) => (
                <TableRow key={order.id}>
                <TableCell className="font-medium">{order.customOrderId || order.id.substring(0, 6)}</TableCell>
                {userType === 'vendor' && <TableCell>{order.clientName}</TableCell>}
                <TableCell>
                    {order.orderDate?.toDate().toLocaleDateString() || 'N/A'}
                </TableCell>
                <TableCell>
                    <Badge variant={order.invoiceType === 'VAT' ? 'outline' : 'secondary'}>
                    {order.invoiceType}
                    </Badge>
                </TableCell>
                <TableCell>
                    {new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                    }).format(order.totalAmount)}
                </TableCell>
                <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                </TableCell>
                <TableCell>
                    <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge>
                </TableCell>
                { (userType === 'vendor') &&
                    <TableCell className="text-right">
                        <VendorActions order={order} />
                    </TableCell>
                }
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
    </>
  );
}
