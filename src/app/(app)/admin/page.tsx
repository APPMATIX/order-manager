
'use client';

import React, { useState } from 'react';
import { useUserProfile } from '@/context/UserProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import type { UserProfile } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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

export default function AdminPage() {
  const { userProfile, isLoading } = useUserProfile();
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isAuthorized = userProfile?.userType === 'admin' || userProfile?.userType === 'super-admin';
  const isSuperAdmin = userProfile?.userType === 'super-admin';

  const handleDeleteRequest = (user: UserProfile) => {
    if (!isSuperAdmin) return;
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (!userToDelete || !isSuperAdmin || !firestore) return;
    const userDocRef = doc(firestore, 'users', userToDelete.id);
    deleteDocumentNonBlocking(userDocRef);
    toast({
      title: 'User Deleted',
      description: `The user ${userToDelete.companyName} (${userToDelete.email}) has been deleted.`,
    });
    setUserToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page. This area is for administrators only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <AdminDashboard
        currentUser={userProfile}
        onDeleteUser={isSuperAdmin ? handleDeleteRequest : undefined}
      />
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user profile for{' '}
              <span className="font-bold">{userToDelete?.companyName}</span>. This does not delete their authentication record, only their profile data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
