
'use client';
import React, { createContext, useContext, useMemo } from 'react';
import { useUserProfileCore } from '@/hooks/useUserProfile';
import type { UserProfile } from '@/lib/types';
import { Loader2, AlertOctagon, LogOut } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface UserProfileContextType {
    userProfile: UserProfile | null;
    isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const { userProfile, isLoading: isProfileLoading, error } = useUserProfileCore();
    const auth = useAuth();

    const isLoading = isAuthLoading || isProfileLoading;

    const value = useMemo(() => ({
        userProfile: userProfile || null,
        isLoading
    }), [userProfile, isLoading]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.href = '/login';
        } catch (e) {
            console.error("Sign out failed", e);
        }
    };

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

    if (isLoading && user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // STRICT ACCOUNT SUSPENSION LOCK
    // This UI is prioritized to prevent the FirebaseErrorListener from 
    // crashing the app on expected permission failures for paused accounts.
    if (userProfile?.status === 'paused') {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
                <div className="bg-destructive/10 p-6 rounded-full mb-8 animate-in zoom-in duration-300">
                    <AlertOctagon className="h-16 w-16 text-destructive" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">Account Suspended</h1>
                <div className="max-w-md bg-muted/30 border border-dashed border-muted-foreground/20 p-6 rounded-2xl mb-8">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Administrator's Remark</p>
                    <p className="text-sm font-medium leading-relaxed">
                        {userProfile.statusRemark || "Your access to the platform has been restricted. Please contact system support for clarification."}
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={handleSignOut} 
                    className="font-black uppercase tracking-widest px-8 h-12 shadow-sm"
                >
                    <LogOut className="mr-2 h-4 w-4" /> Return to Login
                </Button>
            </div>
        );
    }
    
    return (
        <UserProfileContext.Provider value={value}>
            {/* Error listener is placed here so it's only active for non-suspended sessions */}
            <FirebaseErrorListener />
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
