import React from 'react';
import { MainSidebar } from '@/components/main-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { Header } from '@/components/header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <UserProfileProvider>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <MainSidebar />
          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <Header />
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </div>
        </div>
      </UserProfileProvider>
    </AuthGuard>
  );
}
