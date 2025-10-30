'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Loader2 } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { ProductTable } from '@/components/products/product-table';
import type { Product } from '@/lib/types';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/hooks/useUserProfile';


export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const productsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'products') : null),
    [firestore, user]
  );

  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsCollection);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedProduct(null);
  };

  const handleFormSubmit = (formData: Omit<Product, 'id' | 'createdAt'>) => {
    if (!productsCollection || !user) return;

    if (selectedProduct) {
      // Update existing product
      const productDoc = doc(firestore, 'users', user.uid, 'products', selectedProduct.id);
      updateDocumentNonBlocking(productDoc, formData);
    } else {
      // Add new product
      addDocumentNonBlocking(productsCollection, {
        ...formData,
        createdAt: serverTimestamp(),
      });
    }
    handleFormClose();
  };

  const isLoading = isProfileLoading || areProductsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userProfile?.userType !== 'vendor') {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>This area is for vendors only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Manage your product catalog, including SKUs and pricing.
              </CardDescription>
            </div>
            <Button onClick={handleAddProduct}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isFormOpen ? (
            <ProductForm
              product={selectedProduct}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          ) : products && products.length > 0 ? (
            <ProductTable products={products} onEdit={handleEditProduct} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Products Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Click "Add Product" to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
