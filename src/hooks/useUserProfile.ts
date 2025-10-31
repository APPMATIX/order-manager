
'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
// This hook is now a wrapper around the context hook for consistency
// But we still need the core logic for the provider itself
export function useUserProfileCore() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: userProfile, isLoading, error } = useDoc<UserProfile>(userDocRef);

    return { userProfile, isLoading, error };
}
