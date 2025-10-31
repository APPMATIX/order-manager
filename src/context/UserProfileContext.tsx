
'use client';
import React, { createContext, useContext } from 'react';
import { useUserProfileCore } from '@/hooks/useUserProfile';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';

interface UserProfileContextType {
    userProfile: UserProfile | null;
    isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const { userProfile, isLoading: isProfileLoading, error } = useUserProfileCore();

    const isLoading = isAuthLoading || isProfileLoading;

    if (error) {
        // You can render a proper error component here
        return <div>Error loading user profile. Please try again.</div>
    }

    // This is a critical check. If the user is authenticated (user object exists)
    // but the profile is still loading, we MUST show a loading screen.
    // If we're not in an auth loading state AND there's no user, it means the user is logged out,
    // and children can render (which will likely be a redirect from AuthGuard).
    if (isLoading && user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
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
