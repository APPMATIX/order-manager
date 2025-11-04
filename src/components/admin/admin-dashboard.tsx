
'use client';

import React from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { UserProfile, SignupToken } from '@/lib/types';
import { UsersList } from './users-list';
import { TokenManager } from './token-manager';

interface AdminDashboardProps {
  isSuperAdmin: boolean;
  currentUser: UserProfile;
}

export function AdminDashboard({ isSuperAdmin, currentUser }: AdminDashboardProps) {
  const firestore = useFirestore();

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollection);

  const tokensCollection = useMemoFirebase(
    () => (isSuperAdmin ? collection(firestore, 'signup_tokens') : null),
    [firestore, isSuperAdmin]
  );
  const { data: tokens, isLoading: areTokensLoading } = useCollection<SignupToken>(tokensCollection);

  const isLoading = areUsersLoading || (isSuperAdmin && areTokensLoading);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Admin Panel</h1>
      </div>
      <Tabs defaultValue="users" className="mt-4">
        <TabsList>
          <TabsTrigger value="users">Vendors</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="tokens">Signup Tokens</TabsTrigger>}
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
        {isSuperAdmin && (
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
    </>
  );
}

    