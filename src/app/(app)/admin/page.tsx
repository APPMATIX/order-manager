'use client';

import React from 'react';
import { useUserProfile } from '@/context/UserProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default function AdminPage() {
  const { userProfile, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSuperAdmin = userProfile?.userType === 'super-admin';

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page. This area is for the super-admin only.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <AdminDashboard currentUser={userProfile} />;
}
