'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import { Edit, MoreVertical } from 'lucide-react';
import { Input } from '../ui/input';
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
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onPriceChange?: (productId: string, newPrice: number) => void;
}

export function ProductTable({ products, onEdit, onPriceChange }: ProductTableProps) {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPriceId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPriceId]);

  const handlePriceClick = (product: Product) => {
    if (!onPriceChange) return;
    setEditingPriceId(product.id);
    setPriceValue(product.price.toString());
  };

  const handlePriceBlur = () => {
    if (editingPriceId && onPriceChange) {
      const newPrice = parseFloat(priceValue);
      const originalProduct = products.find(p => p.id === editingPriceId);
      if (!isNaN(newPrice) && newPrice > 0 && originalProduct && newPrice !== originalProduct.price) {
        onPriceChange(editingPriceId, newPrice);
      }
    }
    setEditingPriceId(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handlePriceBlur();
    }
    if (event.key === 'Escape') {
      setEditingPriceId(null);
    }
  };

  const PriceDisplay = ({ product }: { product: Product }) => {
    if (editingPriceId === product.id) {
      return (
        <Input
          ref={inputRef}
          type="number"
          value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          onBlur={handlePriceBlur}
          onKeyDown={handleKeyDown}
          className="h-8 w-24"
        />
      );
    }
    return (
      <span onClick={() => handlePriceClick(product)} className={onPriceChange ? 'cursor-pointer' : ''}>
        {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(product.price)}
      </span>
    );
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {products.map((product) => (
          <Card key={product.id} className="mb-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>SKU: {product.sku}</CardDescription>
                  </div>
                   {onEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                   )}
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price / {product.unit}</span>
                  <PriceDisplay product={product} />
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
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              {onEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.sku}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>
                  <PriceDisplay product={product} />
                </TableCell>
                {onEdit && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Product</span>
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
