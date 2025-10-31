
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MainSidebar } from '@/components/main-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { UserProfileProvider, useUserProfile } from '@/context/UserProfileContext';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';

const VENDOR_PAGES = ['/dashboard', '/products', '/orders', '/clients', '/purchase'];
const ADMIN_PAGES = ['/admin'];

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { userProfile, isLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !userProfile) return;

    const isVendorPage = VENDOR_PAGES.some(p => pathname.startsWith(p));
    const isAdminPage = ADMIN_PAGES.some(p => pathname.startsWith(p));

    // If admin is on a vendor page (e.g. /dashboard), redirect to /admin
    if (userProfile.userType === 'admin' && isVendorPage) {
      router.replace('/admin');
    }
    
    // If vendor is on an admin page, redirect to their dashboard
    if (userProfile.userType === 'vendor' && isAdminPage) {
      router.replace('/dashboard');
    }

  }, [userProfile, isLoading, router, pathname]);

  // While checking, show a loading screen to prevent flicker
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
