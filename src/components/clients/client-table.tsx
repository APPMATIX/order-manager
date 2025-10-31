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
import { Client } from '@/lib/types';
import { Edit } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
}

export function ClientTable({ clients, onEdit }: ClientTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Credit Limit</TableHead>
            <TableHead>Payment Terms</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>{client.contactEmail}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('en-AE', {
                  style: 'currency',
                  currency: 'AED',
                }).format(client.creditLimit)}
              </TableCell>
              <TableCell>{client.defaultPaymentTerms}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit Client</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
