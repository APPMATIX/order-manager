'use client';

import React from 'react';
import { MainSidebar } from '@/components/main-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { Header } from '@/components/header';
import Link from 'next/link';
import { CountryProvider } from '@/context/CountryContext';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col animated-gradient">
      <div className="no-print">
        <MainSidebar />
      </div>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <div className="no-print">
          <Header />
        </div>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 bg-transparent">
          {children}
        </main>
        <footer className="py-4 px-6 text-center text-xs text-muted-foreground no-print">
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
        <CountryProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </CountryProvider>
      </UserProfileProvider>
    </AuthGuard>
  );
}