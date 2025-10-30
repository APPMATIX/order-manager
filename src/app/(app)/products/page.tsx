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
    () => {
        if (!user || !firestore || !userProfile) return null;
        const targetUid = userProfile.userType === 'vendor' ? user.uid : userProfile.vendorId;
        if (!targetUid) return null;
        return collection(firestore, 'users', targetUid, 'products');
    },
    [firestore, user, userProfile]
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
    if (!productsCollection || !user || userProfile?.userType !== 'vendor') return;

    if (selectedProduct) {
      const productDoc = doc(firestore, 'users', user.uid, 'products', selectedProduct.id);
      updateDocumentNonBlocking(productDoc, formData);
    } else {
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
  
  const isVendor = userProfile?.userType === 'vendor';

  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
          {isVendor && (
            <Button onClick={handleAddProduct} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
           )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            {isVendor 
                ? "Manage your product catalog, including SKUs and pricing."
                : "Browse available products from your vendor."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFormOpen && isVendor ? (
            <ProductForm
              product={selectedProduct}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          ) : products && products.length > 0 ? (
            <ProductTable products={products} onEdit={isVendor ? handleEditProduct : undefined} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Products Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isVendor ? 'Click "Add Product" to get started.' : 'Your vendor has not added any products.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
