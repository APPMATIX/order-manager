'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager,
  terminate
} from 'firebase/firestore';

/**
 * Strict singleton pattern for Firebase services to prevent 'ca9' assertion failures.
 * 'ca9' occurs when Firestore persistence is initialized multiple times in the same tab.
 */
export function initializeFirebase() {
  // Persistence across HMR (Hot Module Replacement)
  if (typeof window !== 'undefined') {
    const globalAny = window as any;
    if (globalAny.__FIREBASE_APP && globalAny.__FIREBASE_AUTH && globalAny.__FIREBASE_FIRESTORE) {
      return {
        firebaseApp: globalAny.__FIREBASE_APP,
        auth: globalAny.__FIREBASE_AUTH,
        firestore: globalAny.__FIREBASE_FIRESTORE
      };
    }
  }

  const apps = getApps();
  const firebaseApp = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  const auth = getAuth(firebaseApp);
  
  // Only initialize Firestore if it hasn't been cached globally to prevent ID:ca9
  let firestore: Firestore;
  if (typeof window !== 'undefined' && (window as any).__FIREBASE_FIRESTORE) {
    firestore = (window as any).__FIREBASE_FIRESTORE;
  } else {
    firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
    });
  }

  if (typeof window !== 'undefined') {
    const globalAny = window as any;
    globalAny.__FIREBASE_APP = firebaseApp;
    globalAny.__FIREBASE_AUTH = auth;
    globalAny.__FIREBASE_FIRESTORE = firestore;
  }

  return {
    firebaseApp,
    auth,
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
