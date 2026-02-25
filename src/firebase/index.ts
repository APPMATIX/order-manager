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
 * Robust singleton pattern for Firebase services to prevent 'already initialized' errors
 * and assertion failures during development reloads (HMR).
 */
export function initializeFirebase() {
  const globalAny = typeof window !== 'undefined' ? (window as any) : {};
  
  // 1. Return cached instances if they exist
  if (globalAny.__FIREBASE_APP && globalAny.__FIREBASE_AUTH && globalAny.__FIREBASE_FIRESTORE) {
    return {
      firebaseApp: globalAny.__FIREBASE_APP,
      auth: globalAny.__FIREBASE_AUTH,
      firestore: globalAny.__FIREBASE_FIRESTORE
    };
  }

  // 2. Initialize App
  const apps = getApps();
  const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // 3. Initialize Auth
  const authInstance = getAuth(app);
  
  // 4. Initialize Firestore with specific attention to persistence conflicts
  let firestoreInstance: Firestore;
  
  if (apps.length === 0) {
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
      });
    } catch (e) {
      // Fallback if initializeFirestore fails (e.g. environment doesn't support persistence)
      firestoreInstance = getFirestore(app);
    }
  } else {
    firestoreInstance = getFirestore(app);
  }

  // 5. Cache globally for Next.js session
  if (typeof window !== 'undefined') {
    globalAny.__FIREBASE_APP = app;
    globalAny.__FIREBASE_AUTH = authInstance;
    globalAny.__FIREBASE_FIRESTORE = firestoreInstance;
  }

  return {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance
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
