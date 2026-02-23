'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager
} from 'firebase/firestore';

/**
 * Strict singleton pattern for Firebase services to prevent 'already initialized' errors
 * and Firestore persistence assertion failures during Hot Module Replacement (HMR).
 * This pattern ensures that Firebase services are initialized exactly once, 
 * even during Next.js development sessions.
 */
export function initializeFirebase() {
  // 1. Check window cache first for instant retrieval during re-renders/HMR
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

  // 2. Initialize or retrieve the Firebase App instance
  const apps = getApps();
  const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  const authInstance = getAuth(app);
  
  let firestoreInstance: Firestore;
  
  // 3. Defensively initialize Firestore
  // initializeFirestore() must only be called ONCE per app instance if custom options are used.
  if (apps.length > 0) {
    // If the app already exists, Firestore is likely already initialized.
    // Use getFirestore() to safely retrieve the existing instance.
    firestoreInstance = getFirestore(app);
  } else {
    // Fresh app instance, safe to initialize with persistent local cache.
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
      });
    } catch (e) {
      // Fallback in case of concurrent initialization attempts
      firestoreInstance = getFirestore(app);
    }
  }

  // 4. Update window cache for persistent singleton behavior across the client session
  if (typeof window !== 'undefined') {
    const globalAny = window as any;
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
