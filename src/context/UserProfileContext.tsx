
'use client';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
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
        // Handle unauthorized access or missing profile here if needed
    }, [isLoading, userProfile, pathname, router]);

    // Memoize the context value to prevent unnecessary re-renders of consuming components
    const value = useMemo(() => ({
        userProfile,
        isLoading
    }), [userProfile, isLoading]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <h2 className="text-xl font-bold mb-2">Error loading user profile</h2>
                <p className="text-muted-foreground mb-4">Please check your internet connection and try again.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Only show the full-page loader if we know there is a user but we are waiting for their profile.
    if (isLoading && user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <UserProfileContext.Provider value={value}>
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
