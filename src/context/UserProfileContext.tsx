
'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { useUserProfileCore } from '@/hooks/useUserProfile';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

const SUPER_ADMIN_EMAIL = 'kevinparackal10@gmail.com';

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
    
    // Automatically set the super-admin role if the email matches
    const finalUserProfile = userProfile ? {
      ...userProfile,
      userType: userProfile.email === SUPER_ADMIN_EMAIL ? 'super-admin' : userProfile.userType,
    } : null;


    useEffect(() => {
        // Future role-based redirection can be placed here.
    }, [isLoading, finalUserProfile, pathname, router]);

    if (error) {
        return <div>Error loading user profile. Please try again.</div>
    }

    if (isLoading && (isAuthLoading || user)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <UserProfileContext.Provider value={{ userProfile: finalUserProfile, isLoading: isLoading }}>
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

    