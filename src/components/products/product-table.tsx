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
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onPriceChange?: (productId: string, newPrice: number) => void;
}

export function ProductTable({ products, onEdit, onDelete, onPriceChange }: ProductTableProps) {
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

  const ActionsMenu = ({ product }: { product: Product }) => {
    if (!onEdit && !onDelete) return null;
    
    return (
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(product)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                </DropdownMenuItem>
            )}
            {onEdit && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(product)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            )}
        </DropdownMenuContent>
    </DropdownMenu>
    )
  }

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
                      <CardDescription>Product ID: {product.id}</CardDescription>
                  </div>
                   <ActionsMenu product={product} />
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
              <TableHead>Product ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              {(onEdit || onDelete) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs">{product.id}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>
                  <PriceDisplay product={product} />
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell className="text-right">
                    <ActionsMenu product={product} />
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
