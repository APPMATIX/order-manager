
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// Use module-level variables to cache the initialized SDKs.
let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

export function initializeFirebase() {
  if (!cachedApp) {
    cachedApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  }
  return getSdks(cachedApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  if (!cachedAuth) {
    cachedAuth = getAuth(firebaseApp);
  }

  if (!cachedFirestore) {
    try {
      // Try to initialize with specific settings
      cachedFirestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        useFetchStreams: false
      });
    } catch (e) {
      // If already initialized (common in hot-reload), get existing instance
      cachedFirestore = getFirestore(firebaseApp);
    }
  }

  return {
    firebaseApp,
    auth: cachedAuth,
    firestore: cachedFirestore
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
