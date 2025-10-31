
'use client';
import React, { createContext, useContext } from 'react';
import { useUserProfileCore } from '@/hooks/useUserProfile';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface UserProfileContextType {
    userProfile: UserProfile | null;
    isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const { userProfile, isLoading, error } = useUserProfileCore();

    if (error) {
        // You can render a proper error component here
        return <div>Error loading user profile. Please try again.</div>
    }

    // Keep showing loading screen until we have the user profile
    // This is important for the layout redirect logic to work correctly
    if (isLoading || !userProfile) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    

    return (
        <UserProfileContext.Provider value={{ userProfile, isLoading }}>
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
