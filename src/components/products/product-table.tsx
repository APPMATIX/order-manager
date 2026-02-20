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
import { Edit, MoreVertical, Trash2, Pencil, TrendingUp } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useCountry } from '@/context/CountryContext';
import { Badge } from '@/components/ui/badge';

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onPriceChange?: (productId: string, newPrice: number) => void;
}

export function ProductTable({ products, onEdit, onDelete, onPriceChange }: ProductTableProps) {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState<string>('');
  const [updatedProductId, setUpdatedProductId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { formatCurrency } = useCountry();

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
        flashUpdate(editingPriceId);
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

  const flashUpdate = (productId: string) => {
    setUpdatedProductId(productId);
    setTimeout(() => {
      setUpdatedProductId(null);
    }, 1000); // Duration of the animation
  };

  const PriceDisplay = ({ product }: { product: Product }) => {
    const isUpdated = updatedProductId === product.id;

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
      <div 
        onClick={() => handlePriceClick(product)} 
        className={cn(
            'inline-flex items-center gap-2 rounded-md px-2 py-1 transition-all font-bold text-primary',
            onPriceChange && 'cursor-pointer group hover:bg-primary/5',
            isUpdated && 'animate-flash-green'
        )}
      >
        <span>{formatCurrency(product.price)}</span>
         {onPriceChange && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
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
                      <CardDescription>Product ID: {product.sku}</CardDescription>
                  </div>
                   <ActionsMenu product={product} />
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cost Price</span>
                  <span className="text-muted-foreground italic">{formatCurrency(product.costPrice || 0)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-medium">Selling Price / {product.unit}</span>
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
              <TableHead>Cost Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Margin</TableHead>
              {(onEdit || onDelete) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const profit = product.price - (product.costPrice || 0);
              const margin = product.price > 0 ? (profit / product.price) * 100 : 0;
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-muted-foreground italic">
                    {formatCurrency(product.costPrice || 0)}
                  </TableCell>
                  <TableCell>
                    <PriceDisplay product={product} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={margin > 0 ? "default" : "destructive"} className="text-[10px] gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  {(onEdit || onDelete) && (
                    <TableCell className="text-right">
                      <ActionsMenu product={product} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
