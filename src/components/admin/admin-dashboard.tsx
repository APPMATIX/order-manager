
'use client';

import React, { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Briefcase } from 'lucide-react';
import type { UserProfile, SignupToken } from '@/lib/types';
import { UsersList } from './users-list';
import { TokenManager } from './token-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminDashboardProps {
  currentUser: UserProfile;
  onDeleteUser?: (user: UserProfile) => void;
}

export function AdminDashboard({ currentUser, onDeleteUser }: AdminDashboardProps) {
  const firestore = useFirestore();

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
  const isSuperAdmin = currentUser.userType === 'super-admin';

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
          {isSuperAdmin && <TabsTrigger value="tokens">Signup Tokens</TabsTrigger>}
        </TabsList>
        <TabsContent value="users" className="mt-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <UsersList
              users={users || []}
              onDelete={onDeleteUser}
              currentUserId={currentUser.id}
              isSuperAdmin={isSuperAdmin}
            />
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
