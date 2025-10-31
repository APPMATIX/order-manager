
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { UserProfile } from '@/lib/types';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface VendorListProps {
  vendors: UserProfile[];
}

export function VendorList({ vendors }: VendorListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    return vendors.filter(
      (vendor) =>
        vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const getInitial = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'V';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by company or email..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

       {/* Mobile View */}
        <div className="md:hidden space-y-4">
            {filteredVendors.map((vendor) => (
            <Card key={vendor.id}>
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={vendor.photoURL || undefined} />
                            <AvatarFallback>{getInitial(vendor.companyName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{vendor.companyName}</CardTitle>
                            <CardDescription>{vendor.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="text-sm">
                   <div className="flex justify-between">
                        <span className="text-muted-foreground">Joined</span>
                        <span>{vendor.createdAt?.toDate().toLocaleDateString() || 'N/A'}</span>
                    </div>
                </CardContent>
            </Card>
            ))}
        </div>

      {/* Desktop View */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                       <Avatar>
                            <AvatarImage src={vendor.photoURL || undefined} />
                            <AvatarFallback>{getInitial(vendor.companyName)}</AvatarFallback>
                        </Avatar>
                       <span className="font-medium">{vendor.companyName}</span>
                    </div>
                    </TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>{vendor.createdAt?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  No vendors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    