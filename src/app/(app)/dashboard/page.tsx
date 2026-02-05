
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
  // We only show a spinner if we are explicitly waiting for data.
  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished but we have no profile, something went wrong or user is logged out
  if (!userProfile || !user) {
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        Redirecting to login...
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
      return (
        <div className="flex justify-center items-center h-screen">
            <p>Invalid user role. Please contact support.</p>
        </div>
      );
  }
}
