'use client';

import React, { useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
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
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const productsCollection = useMemoFirebase(
    () => {
        if (!user || !firestore ) return null;
        return collection(firestore, 'users', user.uid, 'products');
    },
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
  
  const handleDeleteRequest = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = () => {
    if (!productToDelete || !user) return;
    const productDoc = doc(firestore, 'users', user.uid, 'products', productToDelete.id);
    deleteDocumentNonBlocking(productDoc);
    toast({ title: "Product Deleted", description: `${productToDelete.name} has been deleted.` });
    setProductToDelete(null);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedProduct(null);
  };
  
  const handleFormSubmit = (formData: Omit<Product, 'id' | 'createdAt' | 'sku'>) => {
    if (!productsCollection || !user || userProfile?.userType !== 'vendor' || !products) return;

    if (selectedProduct) {
      const productDoc = doc(firestore, 'users', user.uid, 'products', selectedProduct.id);
      updateDocumentNonBlocking(productDoc, formData);
      toast({ title: "Product Updated", description: `${formData.name} has been updated.` });
    } else {
       addDocumentNonBlocking(productsCollection, {
        ...formData,
        sku: 'deprecated',
      });
      toast({ title: "Product Added", description: `${formData.name} has been added to your catalog.` });
    }
    handleFormClose();
  };
  
  const handlePriceUpdate = async (productId: string, newPrice: number) => {
    if (!user || userProfile?.userType !== 'vendor' || !firestore) return;

    const productDocRef = doc(firestore, 'users', user.uid, 'products', productId);
    try {
      // Using a batch for a single update is overkill, but good practice for extendability
      const batch = writeBatch(firestore);
      batch.update(productDocRef, { price: newPrice });
      await batch.commit();
       toast({
        title: 'Price Updated',
        description: `The price has been successfully updated to ${new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(newPrice)}.`,
      });
    } catch (error) {
      console.error("Failed to update price:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the product price.',
      });
    }
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

  if (!isVendor) {
       return (
       <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. This area is for vendors only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            Manage your product catalog. Click a price to edit it directly.
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
            <ProductTable 
              products={products} 
              onEdit={isVendor ? handleEditProduct : undefined}
              onDelete={isVendor ? handleDeleteRequest : undefined}
              onPriceChange={isVendor ? handlePriceUpdate : undefined}
            />
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
       <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              <span className="font-bold"> {productToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
