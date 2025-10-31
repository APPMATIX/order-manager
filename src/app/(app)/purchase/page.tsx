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
import { PlusCircle, Receipt, Loader2 } from 'lucide-react';
import { PurchaseBillForm } from '@/components/purchase/purchase-bill-form';
import { PurchaseBillTable } from '@/components/purchase/purchase-bill-table';
import type { PurchaseBill } from '@/lib/types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUserProfile } from '@/hooks/useUserProfile';
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

export default function PurchasePage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  const handleAddBill = () => {
    setSelectedBill(null);
    setIsFormOpen(true);
  };

  const handleEditBill = (bill: PurchaseBill) => {
    setSelectedBill(bill);
    setIsFormOpen(true);
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
    setIsFormOpen(false);
    setSelectedBill(null);
  };

  const handleFormSubmit = (formData: Omit<PurchaseBill, 'id' | 'createdAt' | 'billDate'> & { billDate: Date }) => {
    if (!billsCollection || !user) return;
  
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
    }
    handleFormClose();
  };
  
  const isLoading = isProfileLoading || areBillsLoading;

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
          <h1 className="text-lg font-semibold md:text-2xl">Purchase Bills</h1>
          <Button onClick={handleAddBill} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
          </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Manage Purchase Bills</CardTitle>
            <CardDescription>
              Track your cost-of-goods-sold (COGS) by recording purchase bills.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isFormOpen ? (
            <PurchaseBillForm
              bill={selectedBill}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          ) : bills && bills.length > 0 ? (
            <PurchaseBillTable bills={bills} onEdit={handleEditBill} onDelete={handleDeleteRequest} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Receipt className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Purchase Bills Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Click "Add Bill" to record your first purchase.
              </p>
            </div>
          )}
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
