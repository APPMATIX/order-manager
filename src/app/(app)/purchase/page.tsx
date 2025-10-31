
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Receipt, Loader2, ArrowLeft } from 'lucide-react';
import { PurchaseBillForm } from '@/components/purchase/purchase-bill-form';
import { PurchaseBillTable } from '@/components/purchase/purchase-bill-table';
import type { PurchaseBill, Product } from '@/lib/types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/context/UserProfileContext';
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
import { useToast } from '@/hooks/use-toast';
import { PurchaseBillView } from '@/components/purchase/purchase-bill-view';

export default function PurchasePage() {
  const [view, setView] = useState<'list' | 'form' | 'view'>('list');
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<PurchaseBill | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const billsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'purchase_bills') : null),
    [firestore, user]
  );

  const { data: bills, isLoading: areBillsLoading } = useCollection<PurchaseBill>(billsCollection);

  const productsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'products') : null),
    [firestore, user]
  );
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsCollection);

  const handleAddBill = () => {
    setSelectedBill(null);
    setView('form');
  };

  const handleEditBill = (bill: PurchaseBill) => {
    setSelectedBill(bill);
    setView('form');
  };

  const handleViewBill = (bill: PurchaseBill) => {
    setSelectedBill(bill);
    setView('view');
  };

  const handleDeleteRequest = (bill: PurchaseBill) => {
    setBillToDelete(bill);
  };

  const confirmDelete = () => {
    if (!billToDelete || !user) return;
    const billDoc = doc(firestore, 'users', user.uid, 'purchase_bills', billToDelete.id);
    deleteDocumentNonBlocking(billDoc);
    toast({ title: "Purchase Bill Deleted", description: `The bill from ${billToDelete.vendorName} has been deleted.` });
    setBillToDelete(null);
  };

  const handleFormClose = () => {
    setView('list');
    setSelectedBill(null);
  };

  const handleFormSubmit = async (formData: Omit<PurchaseBill, 'id' | 'createdAt' | 'billDate'> & { billDate: Date }) => {
    if (!billsCollection || !user || !productsCollection || !products) return;
  
    const dataToSave = {
      ...formData,
      billDate: formData.billDate,
    };

    if (selectedBill) {
      const billDoc = doc(firestore, 'users', user.uid, 'purchase_bills', selectedBill.id);
      updateDocumentNonBlocking(billDoc, dataToSave);
      toast({ title: "Purchase Bill Updated", description: `The bill from ${formData.vendorName} has been updated.` });
    } else {
      addDocumentNonBlocking(billsCollection, {
        ...dataToSave,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Purchase Bill Added", description: `A new bill from ${formData.vendorName} has been added.` });

      // Automatically add new products
      try {
        const batch = writeBatch(firestore);
        const existingProductNames = products.map(p => p.name.toLowerCase());
        let newProductsAddedCount = 0;

        formData.lineItems.forEach((item, index) => {
            if (!existingProductNames.includes(item.itemName.toLowerCase())) {
                const newDocRef = doc(productsCollection);
                const skuNamePart = item.itemName.substring(0, 3).toUpperCase();
                // Ensure unique SKU by including more characters if needed
                const nextId = (products.length + newProductsAddedCount + 1).toString().padStart(3, '0');
                const newSku = `SKU-${skuNamePart}-${nextId}`;

                batch.set(newDocRef, {
                    id: newDocRef.id,
                    name: item.itemName,
                    unit: item.unit || 'PCS',
                    price: item.costPerUnit, // Set price from costPerUnit
                    sku: newSku,
                    createdAt: serverTimestamp(),
                });
                newProductsAddedCount++;
                // Add to existing names to prevent duplicates within the same bill
                existingProductNames.push(item.itemName.toLowerCase()); 
            }
        });

        if (newProductsAddedCount > 0) {
            await batch.commit();
            toast({
                title: "Products Auto-Added",
                description: `${newProductsAddedCount} new product(s) have been added to your catalog from the bill.`
            })
        }
      } catch (error) {
          console.error("Error auto-adding products:", error);
          toast({
              variant: 'destructive',
              title: "Product Creation Failed",
              description: "Could not automatically add new products from the bill."
          })
      }
    }
    handleFormClose();
  };
  
  const isLoading = isProfileLoading || areBillsLoading || areProductsLoading;

  if (userProfile?.userType !== 'vendor' && !isLoading) {
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
  
  const renderContent = () => {
    if (isLoading) {
       return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    switch (view) {
      case 'form':
        return (
          <PurchaseBillForm
            bill={selectedBill}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
          />
        );
      case 'view':
        return <PurchaseBillView bill={selectedBill} />;
      case 'list':
      default:
        if (bills && bills.length > 0) {
          return <PurchaseBillTable bills={bills} onEdit={handleEditBill} onDelete={handleDeleteRequest} onView={handleViewBill} />;
        }
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Purchase Bills Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Click "Add Bill" to record your first purchase.
            </p>
          </div>
        );
    }
  };
  
  const getHeaderTitle = () => {
    switch (view) {
      case 'form':
        return selectedBill ? 'Edit Purchase Bill' : 'Add Purchase Bill';
      case 'view':
        return `Bill from ${selectedBill?.vendorName}`;
      case 'list':
      default:
        return 'Manage Purchase Bills';
    }
  };

  const getHeaderDescription = () => {
     switch (view) {
      case 'form':
        return 'Fill in the details of the purchase bill below.';
      case 'view':
        return `Details for the bill dated ${selectedBill?.billDate?.toDate().toLocaleDateString()}.`;
      case 'list':
      default:
        return 'Track your cost-of-goods-sold (COGS) by recording purchase bills.';
    }
  }


  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Purchase Bills</h1>
           {view === 'list' ? (
                <Button onClick={handleAddBill} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
                </Button>
            ) : (
                <Button onClick={handleFormClose} size="sm" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bills
                </Button>
            )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>{getHeaderTitle()}</CardTitle>
            <CardDescription>
              {getHeaderDescription()}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill from
              <span className="font-bold"> {billToDelete?.vendorName}</span>.
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

    