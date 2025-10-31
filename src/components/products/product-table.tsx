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
import { Edit } from 'lucide-react';
import { Input } from '../ui/input';

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

  return (
    <div className="overflow-x-auto">
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
              <TableCell onClick={() => handlePriceClick(product)} className={onPriceChange ? 'cursor-pointer' : ''}>
                {editingPriceId === product.id ? (
                  <Input
                    ref={inputRef}
                    type="number"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    onBlur={handlePriceBlur}
                    onKeyDown={handleKeyDown}
                    className="h-8"
                  />
                ) : (
                  new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                  }).format(product.price)
                )}
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
  );
}
