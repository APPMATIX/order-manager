
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';

/**
 * Strict singleton pattern for Firebase services to prevent 'ca9' assertion failures.
 * We use a global variable to ensure we don't re-initialize during Turbopack hot reloads.
 */
let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedFirestore: Firestore | undefined;

export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    // Check global scope first for persistence across hot reloads
    const globalAny = window as any;
    if (globalAny.__FIREBASE_APP) {
      return {
        firebaseApp: globalAny.__FIREBASE_APP,
        auth: globalAny.__FIREBASE_AUTH,
        firestore: globalAny.__FIREBASE_FIRESTORE
      };
    }
  }

  if (!cachedApp) {
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
    // Explicit initialization with persistent cache settings prevents technical crashes in dev
    cachedFirestore = initializeFirestore(cachedApp, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
    });
  }

  // Store in global scope for Next.js hot reloading resilience
  if (typeof window !== 'undefined') {
    const globalAny = window as any;
    globalAny.__FIREBASE_APP = cachedApp;
    globalAny.__FIREBASE_AUTH = cachedAuth;
    globalAny.__FIREBASE_FIRESTORE = cachedFirestore;
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
