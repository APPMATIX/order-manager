'use client';

import React, { useMemo, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Briefcase, Shield, BarChart3 } from 'lucide-react';
import type { UserProfile, SignupToken } from '@/lib/types';
import { UsersList } from './users-list';
import { TokenManager } from './token-manager';
import { UsageAnalytics } from './usage-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

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

  const { totalUsers, vendorCount, adminCount } = useMemo(() => {
    if (!users) return { totalUsers: 0, vendorCount: 0, adminCount: 0 };
    return {
      totalUsers: users.length,
      vendorCount: users.filter(u => u.userType === 'vendor').length,
      adminCount: users.filter(u => u.userType === 'admin').length,
    };
  }, [users]);

  const isLoading = areUsersLoading || areTokensLoading;
  const isSuperAdmin = currentUser.userType === 'admin';

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


  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black uppercase tracking-tighter md:text-3xl">System Administration</h1>
      </div>
      
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md border-primary/5 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : totalUsers}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Global registered pool</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-primary/5 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Vendors</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : vendorCount}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Managed supplier entities</p>
          </CardContent>
        </Card>
         <Card className="shadow-md border-primary/5 hover:border-primary/20 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Staff Admins</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : adminCount}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Platform overseers</p>
          </CardContent>
        </Card>
      </div>

       <Card className="mt-8 shadow-lg border-primary/5">
        <CardHeader className="bg-muted/10">
            <CardTitle className="text-lg font-black uppercase tracking-widest">Management Console</CardTitle>
            <CardDescription className="text-xs">Oversee system health, security, and global identifiers.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <Tabs defaultValue="users">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="users" className="font-black uppercase text-[10px] tracking-widest">
                    <Users className="mr-2 h-3.5 w-3.5" />
                    User Directory
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="font-black uppercase text-[10px] tracking-widest">
                    <BarChart3 className="mr-2 h-3.5 w-3.5" />
                    Usage Analytics
                  </TabsTrigger>
                  {isSuperAdmin && (
                    <TabsTrigger value="tokens" className="font-black uppercase text-[10px] tracking-widest">
                      <Shield className="mr-2 h-3.5 w-3.5" />
                      Invite Tokens
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="users">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <UsersList
                    users={users?.filter(u => u.userType !== 'client') || []}
                    onDelete={handleDeleteRequest}
                    currentUserId={currentUser.id}
                    isAdmin={isSuperAdmin}
                    />
                )}
                </TabsContent>

                <TabsContent value="analytics">
                  <UsageAnalytics vendors={users?.filter(u => u.userType === 'vendor') || []} />
                </TabsContent>

                {isSuperAdmin && (
                <TabsContent value="tokens">
                    {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                    ) : (
                    <TokenManager tokens={tokens || []} adminId={currentUser.id} />
                    )}
                </TabsContent>
                )}
            </Tabs>
        </CardContent>
       </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-tight text-destructive">Confirm User Removal</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the user profile for{' '}
              <span className="font-bold text-foreground">{userToDelete?.companyName}</span>. 
              Note: This removes data access but does not delete the core auth record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold uppercase text-[10px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 font-bold uppercase text-[10px]">
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
