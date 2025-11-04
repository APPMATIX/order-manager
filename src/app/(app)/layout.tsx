
'use client';

import React from 'react';
import { MainSidebar } from '@/components/main-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { Header } from '@/components/header';
import Link from 'next/link';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col animated-gradient">
      <MainSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 bg-transparent">
          {children}
        </main>
        <footer className="py-4 px-6 text-center text-xs text-muted-foreground">
          <p>
            Copyright &copy; {new Date().getFullYear()}{' '}
            <Link
              href="https://www.appmatixsolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Appmatix Solutions
            </Link>
            . All Rights Reserved.
          </p>
        </footer>
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
