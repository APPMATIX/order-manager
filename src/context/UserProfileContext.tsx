
'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { useUserProfileCore } from '@/hooks/useUserProfile';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface UserProfileContextType {
    userProfile: UserProfile | null;
    isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const { userProfile, isLoading: isProfileLoading, error } = useUserProfileCore();
    const router = useRouter();
    const pathname = usePathname();

    const isLoading = isAuthLoading || isProfileLoading;

    useEffect(() => {
        // This effect can be used for role-based redirection if needed in the future.
    }, [isLoading, userProfile, pathname, router]);

    if (error) {
        return <div>Error loading user profile. Please try again.</div>
    }

    // While authentication is happening OR if the user is logged in but we are still fetching their profile, show a loader.
    if (isLoading && (isAuthLoading || user)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // If we're done loading, and there's a profile, we can render children.
    // Also, if we're done loading and there's NO user (logged out), we should also render children
    // so that the AuthGuard can properly redirect to the login page.
    return (
        <UserProfileContext.Provider value={{ userProfile, isLoading: isLoading }}>
            {children}
        </UserProfileContext.Provider>
    );
};

export const useUserProfile = (): UserProfileContextType => {
    const context = useContext(UserProfileContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
};

    
