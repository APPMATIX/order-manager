'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/context/UserProfileContext';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ClientPlaceOrder from '@/components/dashboards/client-place-order';

export default function PlaceOrderPage() {
  const { user } = useUser();
  const { userProfile, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userProfile?.userType !== 'client') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            This page is for client accounts only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!user || !userProfile) return null;

  return <ClientPlaceOrder user={user} userProfile={userProfile} />;
}