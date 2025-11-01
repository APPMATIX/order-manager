'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Loader2, Search } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { ProductTable } from '@/components/products/product-table';
import type { Product } from '@/lib/types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/context/UserProfileContext';
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
import { Input } from '@/components/ui/input';
import { PRODUCT_UNITS } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
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

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(product =>
        unitFilter === 'All' || product.unit === unitFilter
      );
  }, [products, searchTerm, unitFilter]);

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
      updateDocumentNonBlocking(productDoc, { ...formData, price: Number(formData.price) });
      toast({ title: "Product Updated", description: `${formData.name} has been updated.` });
    } else {
       const newDocRef = doc(productsCollection);
       const skuNamePart = formData.name.substring(0, 3).toUpperCase();
       const nextId = (products.length + 1).toString().padStart(3, '0');
       const newSku = `SKU-${skuNamePart}-${nextId}`;

       setDocumentNonBlocking(newDocRef, {
        id: newDocRef.id,
        ...formData,
        price: Number(formData.price),
        sku: newSku,
        createdAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "Product Added", description: `${formData.name} has been added to your catalog.` });
    }
    handleFormClose();
  };
  
  const handlePriceUpdate = async (productId: string, newPrice: number) => {
    if (!user || userProfile?.userType !== 'vendor' || !firestore) return;

    const productDocRef = doc(firestore, 'users', user.uid, 'products', productId);
    try {
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
  
  if (userProfile?.userType !== 'vendor') {
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
          {!isFormOpen && (
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
          {isFormOpen ? (
            <ProductForm
              product={selectedProduct}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          ) : (
            <>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                        type="search"
                        placeholder="Search by name or SKU..."
                        className="w-full pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={unitFilter} onValueChange={setUnitFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by unit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Units</SelectItem>
                            {PRODUCT_UNITS.map(unit => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {filteredProducts && filteredProducts.length > 0 ? (
                <ProductTable 
                    products={filteredProducts} 
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteRequest}
                    onPriceChange={handlePriceUpdate}
                />
                ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                    <Package className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Products Found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                     {searchTerm || unitFilter !== 'All' ? `Your search criteria did not return any results.` : 'You have not added any products yet.'}
                    </p>
                </div>
                )}
            </>
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
