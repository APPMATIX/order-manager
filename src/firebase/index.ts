
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';

/**
 * Strict singleton pattern for Firebase services to prevent 'ca9' assertion failures.
 */
let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedFirestore: Firestore | undefined;

export function initializeFirebase() {
  if (!cachedApp) {
    // Standard initialization with turbopack check
    const apps = getApps();
    if (apps.length > 0) {
      cachedApp = getApp();
    } else {
      cachedApp = initializeApp(firebaseConfig);
    }
  }
  
  if (!cachedAuth) {
    cachedAuth = getAuth(cachedApp);
  }
  
  if (!cachedFirestore) {
    // Explicit initialization with persistent cache settings often prevents technical crashes in dev
    cachedFirestore = initializeFirestore(cachedApp, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
    });
  }

  return {
    firebaseApp: cachedApp,
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
