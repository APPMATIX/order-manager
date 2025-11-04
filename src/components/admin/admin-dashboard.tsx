
'use client';

import React, { useMemo, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Briefcase } from 'lucide-react';
import type { UserProfile, SignupToken } from '@/lib/types';
import { UsersList } from './users-list';
import { TokenManager } from './token-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  const tokensCollection = useMemoFirebase(() => collection(firestore, 'signup_tokens'), [firestore]);
  const { data: tokens, isLoading: areTokensLoading } = useCollection<SignupToken>(tokensCollection);

  const { totalUsers, vendorCount } = useMemo(() => {
    if (!users) return { totalUsers: 0, vendorCount: 0 };
    return {
      totalUsers: users.length,
      vendorCount: users.filter(u => u.userType === 'vendor').length,
    };
  }, [users]);

  const isLoading = areUsersLoading || areTokensLoading;
  const isAdmin = currentUser.userType === 'admin';

  const handleDeleteRequest = (user: UserProfile) => {
    if (!isAdmin) return;
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (!userToDelete || !isAdmin || !firestore) return;
    const userDocRef = doc(firestore, 'users', userToDelete.id);
    deleteDocumentNonBlocking(userDocRef);
    toast({
      title: 'User Deleted',
      description: `The user ${userToDelete.companyName} (${userToDelete.email}) has been deleted.`,
    });
    setUserToDelete(null);
  };


  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Admin Panel</h1>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered accounts.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : vendorCount}</div>
            <p className="text-xs text-muted-foreground">Total vendor accounts.</p>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="users" className="mt-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          {isAdmin && <TabsTrigger value="tokens">Signup Tokens</TabsTrigger>}
        </TabsList>
        <TabsContent value="users" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <UsersList
              users={users || []}
              onDelete={handleDeleteRequest}
              currentUserId={currentUser.id}
              isAdmin={isAdmin}
            />
          )}
        </TabsContent>
        {isAdmin && (
          <TabsContent value="tokens" className="mt-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <TokenManager tokens={tokens || []} adminId={currentUser.id} />
            )}
          </TabsContent>
        )}
      </Tabs>
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
