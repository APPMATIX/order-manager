'use client';

import { useState, useEffect, useRef } from 'react';
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
  
  // Use a ref to track status for the async event handler to avoid race conditions
  const statusRef = useRef(userProfile?.status);
  
  useEffect(() => {
    statusRef.current = userProfile?.status;
  }, [userProfile?.status]);

  useEffect(() => {
    const handleError = (incomingError: FirestorePermissionError) => {
      // PROACTIVE SUPPRESSION:
      // If rules deny access, the account is likely suspended.
      // We check the cached profile status.
      if (statusRef.current === 'paused') {
        return;
      }
      
      // If we are in a transition state (rules updated but React state hasn't yet),
      // we check the context one last time before throwing.
      // Note: We don't use 'await' here because the listener is synchronous,
      // but the early return if already paused covers 99% of cases.
      setError(incomingError);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    // If the error happened but the provider has now updated to 'paused',
    // we clear the error instead of throwing.
    if (userProfile?.status === 'paused') {
      return null;
    }
    throw error;
  }

  return null;
}