'use client';

import React from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { UserProfile, SignupToken } from '@/lib/types';
import { UsersList } from './users-list';
import { TokenManager } from './token-manager';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const firestore = useFirestore();

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  const tokensCollection = useMemoFirebase(
    () => collection(firestore, 'signup_tokens'),
    [firestore]
  );
  const { data: tokens, isLoading: areTokensLoading } = useCollection<SignupToken>(tokensCollection);

  const isLoading = areUsersLoading || areTokensLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Super Admin Panel</h1>
      </div>
      <Tabs defaultValue="users" className="mt-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="tokens">Signup Tokens</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <UsersList users={users || []} />
          )}
        </TabsContent>
        <TabsContent value="tokens" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <TokenManager tokens={tokens || []} adminId={currentUser.id} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
