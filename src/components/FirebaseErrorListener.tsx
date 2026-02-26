'use client';

import { useState, useEffect, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUserProfile } from '@/context/UserProfileContext';
import { doc, getDocFromServer } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 * 
 * Logic: If a permission error occurs, we double-check the account status directly
 * from the server. If the account is suspended, we suppress the crash overlay 
 * to allow the UserProfileProvider to render the secure suspension screen.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  
  // Use a ref to track status for the async event handler to avoid race conditions
  const statusRef = useRef(userProfile?.status);
  
  useEffect(() => {
    statusRef.current = userProfile?.status;
  }, [userProfile?.status]);

  useEffect(() => {
    const handleError = async (incomingError: FirestorePermissionError) => {
      // 1. Proactive suppression based on local state
      if (statusRef.current === 'paused') {
        return;
      }

      // 2. Verified suppression based on server state
      // This handles the transition gap where rules have updated but local state hasn't.
      if (userProfile?.id) {
        try {
          const userDocRef = doc(firestore, 'users', userProfile.id);
          const snap = await getDocFromServer(userDocRef);
          if (snap.exists() && snap.data().status === 'paused') {
            return;
          }
        } catch (e) {
          // If we can't read our own profile, we're likely suspended/locked anyway
        }
      }
      
      setError(incomingError);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [userProfile?.id, firestore]);

  if (error) {
    // Final check before crashing
    if (userProfile?.status === 'paused') {
      return null;
    }
    throw error;
  }

  return null;
}