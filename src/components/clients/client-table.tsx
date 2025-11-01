
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
import { Edit, MoreVertical, Trash2, FileText } from 'lucide-react';
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

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  return (
    <>
        {/* Mobile View */}
        <div className="md:hidden">
            {clients.map((client) => (
                <Card key={client.id} className="mb-4">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{client.name}</CardTitle>
                                <CardDescription>{client.contactEmail}</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(client)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(client)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Credit Limit</span>
                            <span>
                                {new Intl.NumberFormat('en-AE', {
                                style: 'currency',
                                currency: 'AED',
                                }).format(client.creditLimit)}
                            </span>
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-muted-foreground">Payment Terms</span>
                            <span>{client.defaultPaymentTerms}</span>
                        </div>
                         <div className="flex justify-between mt-2">
                            <span className="text-muted-foreground">TRN</span>
                            <span>{client.trn || 'N/A'}</span>
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>TRN</TableHead>
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
                <TableCell>{client.trn || 'N/A'}</TableCell>
                <TableCell>
                    {new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                    }).format(client.creditLimit)}
                </TableCell>
                <TableCell>{client.defaultPaymentTerms}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onEdit(client)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(client)} className="text-destructive">
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
