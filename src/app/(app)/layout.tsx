
'use client';

import React from 'react';
import { MainSidebar } from '@/components/main-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { UserProfileProvider, useUserProfile } from '@/context/UserProfileContext';
import { Header } from '@/components/header';
import { useRouter } from 'next/navigation';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { userProfile } = useUserProfile();
  const router = useRouter();

  // This effect will run when userProfile is available
  React.useEffect(() => {
    if (userProfile) {
       // If an admin tries to access a non-admin page, redirect them.
      if (userProfile.userType === 'admin') {
        const allowedAdminPaths = ['/admin', '/profile'];
        const currentPath = window.location.pathname;
        if (!allowedAdminPaths.some(path => currentPath.startsWith(path))) {
          router.replace('/admin');
        }
      }
    }
  }, [userProfile, router]);


  return (
    <div className="flex min-h-screen w-full flex-col animated-gradient">
      <MainSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <UserProfileProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </UserProfileProvider>
    </AuthGuard>
  );
}

    