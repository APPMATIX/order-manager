
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore: Firestore;
  
  // initializeFirestore can only be called once per app instance.
  // We use a try-catch block to handle cases where it might have been initialized already,
  // which is common during Next.js hot reloads or multiple provider mounts.
  try {
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      useFetchStreams: false
    });
  } catch (e) {
    // If initialization fails (e.g. "Firestore has already been initialized"), 
    // fall back to getFirestore which returns the existing instance.
    firestore = getFirestore(firebaseApp);
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
