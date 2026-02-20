'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, serverTimestamp, writeBatch, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Receipt, Loader2, ArrowLeft, Search, Download } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function PurchasePage() {
  const [view, setView] = useState<'list' | 'form' | 'view'>('list');
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<PurchaseBill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const billsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'purchase_bills') : null),
    [firestore, user]
  );

  const { data: bills, isLoading: areBillsLoading } = useCollection<PurchaseBill>(billsCollection);

  const filteredBills = useMemo(() => {
    if (!bills) return [];
    return bills.filter(bill =>
      bill.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, searchTerm]);


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
    toast({ title: "Purchase Bill Deleted", description: `The bill has been deleted.` });
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
      toast({ title: "Purchase Bill Updated", description: `Updated.` });
    } else {
      addDocumentNonBlocking(billsCollection, {
        ...dataToSave,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Purchase Bill Added", description: `Recorded successfully.` });

      // Automatically update product cost prices and add new products
      try {
        const batch = writeBatch(firestore);
        const existingProducts = [...products];
        let operationsCount = 0;

        formData.lineItems.forEach((item) => {
            const existingProduct = existingProducts.find(p => p.name.toLowerCase() === item.itemName.toLowerCase());
            
            if (existingProduct) {
                // Update cost price of existing product
                const productDocRef = doc(firestore, 'users', user.uid, 'products', existingProduct.id);
                batch.update(productDocRef, { costPrice: item.costPerUnit });
                operationsCount++;
            } else {
                // Add new product
                const newDocRef = doc(productsCollection);
                const skuNamePart = item.itemName.substring(0, 3).toUpperCase();
                const nextId = (products.length + 1).toString().padStart(3, '0');
                const newSku = `SKU-${skuNamePart}-${nextId}`;

                batch.set(newDocRef, {
                    id: newDocRef.id,
                    name: item.itemName,
                    unit: item.unit || 'PCS',
                    price: item.costPerUnit * 1.3, // Initial 30% markup estimate
                    costPrice: item.costPerUnit,
                    sku: newSku,
                    createdAt: serverTimestamp(),
                });
                operationsCount++;
            }
        });

        if (operationsCount > 0) {
            await batch.commit();
            toast({
                title: "Catalog Synced",
                description: `Prices and items in your catalog have been updated based on this bill.`
            })
        }
      } catch (error) {
          console.error("Error syncing products:", error);
      }
    }
    handleFormClose();
  };
  
  const downloadPurchaseReport = () => {
    if (!filteredBills) return;
    const headers = ['Vendor Name', 'Bill Date', 'Subtotal', 'VAT', 'Total'];
    let csvContent = headers.join(',') + '\n';
    
    filteredBills.forEach(bill => {
        const row = [
            `"${bill.vendorName.replace(/"/g, '""')}"`,
            format(bill.billDate.toDate(), 'yyyy-MM-dd'),
            bill.subTotal.toFixed(2),
            bill.vatAmount.toFixed(2),
            bill.totalAmount.toFixed(2)
        ].join(',');
        csvContent += row + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `purchase_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isProfileLoading || areBillsLoading || areProductsLoading;

  if (userProfile?.userType !== 'vendor' && !isLoading) {
    return (
       <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Vendors only.
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
        if (filteredBills && filteredBills.length > 0) {
          return <PurchaseBillTable bills={filteredBills} onEdit={handleEditBill} onDelete={handleDeleteRequest} onView={handleViewBill} />;
        }
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Purchase Bills Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm ? `No results.` : 'Record your first purchase.'}
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Purchase Bills</h1>
           {view === 'list' ? (
                <div className="flex items-center gap-2">
                    <Button onClick={downloadPurchaseReport} variant="outline" size="sm" disabled={!filteredBills || filteredBills.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Report
                    </Button>
                    <Button onClick={handleAddBill} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
                    </Button>
                </div>
            ) : (
                <Button onClick={handleFormClose} size="sm" variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bills
                </Button>
            )}
      </div>
      <Card>
        <CardHeader>
            <CardTitle>{view === 'form' ? 'Record Purchase' : view === 'view' ? 'Bill Details' : 'Purchase History'}</CardTitle>
            <CardDescription>
              {view === 'list' ? 'Track your cost-of-goods-sold by recording purchase bills.' : 'Fill in the bill details.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'list' && (
            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search vendor..."
                    className="w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          )}
          {renderContent()}
        </CardContent>
      </Card>
      <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
