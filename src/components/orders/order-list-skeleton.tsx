
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
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/types';

interface OrderListSkeletonProps {
  userType: UserProfile['userType'];
}

export function OrderListSkeleton({ userType }: OrderListSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          {userType === 'vendor' && <TableHead>Client</TableHead>}
          <TableHead>Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-[80px]" />
            </TableCell>
            {userType === 'vendor' && (
              <TableCell>
                <Skeleton className="h-4 w-[120px]" />
              </TableCell>
            )}
            <TableCell>
              <Skeleton className="h-4 w-[100px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[80px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[100px] rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[100px] rounded-full" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-8 w-8 rounded-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
