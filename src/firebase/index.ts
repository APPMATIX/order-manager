
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// Use a module-level variable to cache the initialized SDKs.
// This prevents multiple initializations during Next.js hot reloads.
let cachedSdks: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null = null;

export function initializeFirebase() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  if (cachedSdks && cachedSdks.firebaseApp === firebaseApp) {
    return cachedSdks;
  }

  let firestore: Firestore;
  
  try {
    // initializeFirestore can only be called once per app instance.
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      useFetchStreams: false
    });
  } catch (e) {
    // Fall back to getFirestore if already initialized.
    firestore = getFirestore(firebaseApp);
  }

  cachedSdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };

  return cachedSdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
