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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSub, 
  DropdownMenuSubTrigger, 
  DropdownMenuPortal, 
  DropdownMenuSeparator,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Eye, MoreVertical, Trash2, Edit, Printer, FileText } from 'lucide-react';
import type { Order, UserProfile } from '@/lib/types';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/config';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { useCountry } from '@/context/CountryContext';

interface OrderListProps {
  orders: Order[];
  userType: UserProfile['userType'];
  onView: (order: Order) => void;
  onReceipt?: (order: Order) => void;
  onPrice?: (order: Order) => void;
  onUpdateStatus?: (orderId: string, field: 'status' | 'paymentStatus', newStatus: Order['status'] | Order['paymentStatus']) => void;
  onDelete?: (order: Order) => void;
}

const getStatusVariant = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'secondary';
      case 'Awaiting Pricing': return 'destructive';
      case 'Priced': return 'default';
      case 'Accepted': return 'default';
      case 'In Transit': return 'outline';
      case 'Delivered': return 'default';
      default: return 'secondary';
    }
};

const getPaymentStatusVariant = (status?: Order['paymentStatus']) => {
    switch (status) {
    case 'Unpaid': return 'destructive';
    case 'Invoiced': return 'secondary';
    case 'Paid': return 'default';
    case 'Overdue': return 'destructive';
    default: return 'secondary';
    }
};


export function OrderList({ orders, userType, onView, onReceipt, onPrice, onUpdateStatus, onDelete }: OrderListProps) {
  const { formatCurrency } = useCountry();

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
            {onReceipt && (
              <DropdownMenuItem onClick={() => onReceipt(order)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
              </DropdownMenuItem>
            )}
            {order.status === 'Awaiting Pricing' && onPrice && (
              <DropdownMenuItem onClick={() => onPrice(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Price Order
              </DropdownMenuItem>
            )}
            {onUpdateStatus && (
              <>
                <DropdownMenuSeparator />
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
              </>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(order)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Order
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
        {/* Mobile View */}
        <div className="md:hidden">
        {orders.map((order) => (
          <Card key={order.id} className="mb-4 overflow-hidden border-primary/5">
            <CardHeader className="bg-muted/5 pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {order.customOrderId ? (
                    <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-primary" />
                        <span className="text-sm font-black uppercase tracking-tight text-primary">{order.customOrderId}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">Draft ORD-{order.id.substring(0, 4)}</span>
                  )}
                  <CardTitle className="text-lg font-black tracking-tight">{order.clientName}</CardTitle>
                </div>
                {userType === 'vendor' ? <VendorActions order={order} /> : (
                     <Button variant="ghost" size="icon" onClick={() => onView(order)} disabled={order.status === 'Awaiting Pricing'}>
                      <Eye className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium uppercase text-[10px]">Document Date</span>
                <span className="font-bold">{order.orderDate?.toDate().toLocaleDateString() || 'N/A'}</span>
              </div>
               <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium uppercase text-[10px]">Net Total</span>
                  <span className="font-black text-primary">
                    {typeof order.totalAmount === 'number' ? formatCurrency(order.totalAmount) : 'AWAITING PRICING'}
                  </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium uppercase text-[10px]">Fulfillment</span>
                <Badge variant={getStatusVariant(order.status)} className="font-bold uppercase text-[9px] tracking-widest">{order.status}</Badge>
              </div>
              {order.paymentStatus && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium uppercase text-[10px]">Account Status</span>
                  <Badge variant={getPaymentStatusVariant(order.paymentStatus)} className="font-bold uppercase text-[9px] tracking-widest">{order.paymentStatus}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Document / Invoice</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Client Account</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Total Value</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Fulfillment</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/20">
                <TableCell>
                    {order.customOrderId ? (
                        <div className="flex flex-col">
                            <span className="font-black text-primary text-sm uppercase tracking-tight">{order.customOrderId}</span>
                            <Badge variant={order.invoiceType === 'VAT' ? 'outline' : 'secondary'} className="w-fit text-[8px] h-4 mt-1 font-bold uppercase">{order.invoiceType || 'Standard'}</Badge>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="font-bold text-muted-foreground text-xs uppercase tracking-widest">Draft Order</span>
                            <span className="text-[9px] font-mono text-muted-foreground opacity-60">ID: {order.id.substring(0, 8)}</span>
                        </div>
                    )}
                </TableCell>
                <TableCell className="font-black uppercase tracking-tight text-sm">{order.clientName}</TableCell>
                <TableCell className="text-xs font-medium">
                    {order.orderDate?.toDate().toLocaleDateString() || 'N/A'}
                </TableCell>
                <TableCell className="font-black text-primary">
                    {typeof order.totalAmount === 'number' ? formatCurrency(order.totalAmount) : <span className="text-[10px] text-muted-foreground uppercase opacity-50">Pending Pricing</span>}
                </TableCell>
                <TableCell>
                    <div className="space-y-1.5">
                        <Badge variant={getStatusVariant(order.status)} className="font-bold uppercase text-[9px] tracking-widest block w-fit">{order.status}</Badge>
                        {order.paymentStatus && (
                            <Badge variant={getPaymentStatusVariant(order.paymentStatus)} className="font-bold uppercase text-[9px] tracking-widest block w-fit">{order.paymentStatus}</Badge>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    {userType === 'vendor' ? <VendorActions order={order} /> : (
                        <Button variant="ghost" size="icon" onClick={() => onView(order)} disabled={order.status === 'Awaiting Pricing'}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    )}
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
    </>
  );
}