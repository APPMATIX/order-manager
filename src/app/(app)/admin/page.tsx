
'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/context/UserProfileContext';
import type { UserProfile, SignupToken } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorList } from '@/components/admin/vendor-list';
import { TokenList } from '@/components/admin/token-list';

function AdminDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();

  const vendorsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users'), where('userType', '==', 'vendor')) : null),
    [firestore, user]
  );
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<UserProfile>(vendorsQuery);

  const tokensCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'signup_tokens') : null),
    [firestore, user]
  );
  const { data: tokens, isLoading: areTokensLoading } = useCollection<SignupToken>(tokensCollection);

  const isLoading = areVendorsLoading || areTokensLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="vendors">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="vendors">Vendors</TabsTrigger>
        <TabsTrigger value="tokens">Signup Tokens</TabsTrigger>
      </TabsList>
      <TabsContent value="vendors">
        <Card>
          <CardHeader>
            <CardTitle>Manage Vendors</CardTitle>
            <CardDescription>View and search for registered vendor accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <VendorList vendors={vendors || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="tokens">
        <Card>
          <CardHeader>
            <CardTitle>Manage Signup Tokens</CardTitle>
            <CardDescription>Generate and track single-use tokens for new vendor signups.</CardDescription>
          </CardHeader>
          <CardContent>
            <TokenList tokens={tokens || []} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}


export default function AdminPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userProfile?.userType !== 'admin') {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. This area is for administrators only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Admin Panel</h1>
      </div>
      <AdminDashboard />
    </>
  );
}

    