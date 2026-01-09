
'use client';
import React from 'react';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/context/UserProfileContext';
import { Loader2 } from 'lucide-react';
import VendorDashboard from '@/components/dashboards/vendor-dashboard';
import ClientDashboard from '@/components/dashboards/client-dashboard';
import AdminDashboard from '@/components/admin/admin-dashboard';

export default function DashboardPage() {
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  // The AuthGuard and UserProfileProvider handle the main loading states.
  // We just need to ensure the data is available before rendering the correct dashboard.
  if (isProfileLoading || !userProfile || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  switch (userProfile.userType) {
    case 'vendor':
      return <VendorDashboard user={user} userProfile={userProfile} />;
    case 'client':
      return <ClientDashboard user={user} userProfile={userProfile} />;
    case 'admin':
        return <AdminDashboard currentUser={userProfile} />;
    default:
      // This can happen briefly while data loads or if there's an unexpected userType.
      // A loading spinner is a safe fallback.
      return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }
}
