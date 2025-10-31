
'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VendorListProps {
  vendors: UserProfile[];
}

export function VendorList({ vendors }: VendorListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    return vendors.filter(vendor => 
      vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);
  
  const getInitial = (name: string | undefined | null) => {
    return name ? name.charAt(0).toUpperCase() : 'V';
  };

  return (
    <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            type="search"
            placeholder="Search vendors by name or email..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="overflow-x-auto rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>TRN</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={vendor.photoURL || undefined} alt={vendor.companyName} />
                            <AvatarFallback>{getInitial(vendor.companyName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{vendor.companyName}</span>
                    </div>
                </TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>{vendor.trn || 'N/A'}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
        {filteredVendors.length === 0 && (
            <p className="text-center text-muted-foreground pt-4">No vendors match your search.</p>
        )}
    </div>
  );
}
