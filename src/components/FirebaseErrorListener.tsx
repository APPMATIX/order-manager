'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUserProfile } from '@/context/UserProfileContext';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 * 
 * Logic: If the user is suspended (status == 'paused'), we suppress these errors
 * because the UserProfileProvider is already handling the high-level UI block.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { userProfile } = useUserProfile();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Suppress permission errors if the account is known to be paused.
      // The UserProfileProvider shows a dedicated screen for this.
      if (userProfile?.status === 'paused') {
        return;
      }
      
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [userProfile?.status]);

  if (error) {
    throw error;
  }

  return null;
}
