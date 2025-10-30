import React from 'react';
import { MainSidebar } from '@/components/main-sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { UserProfileProvider } from '@/context/UserProfileContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <UserProfileProvider>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <MainSidebar />
          <main className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            {children}
          </main>
        </div>
      </UserProfileProvider>
    </AuthGuard>
  );
}
