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
 * Singleton pattern for Firebase services.
 * Prevents multiple initialization errors during Hot Module Replacement (HMR).
 */
export function initializeFirebase() {
  const globalAny = typeof window !== 'undefined' ? (window as any) : {};
  
  // Return cached instances if they exist
  if (globalAny.__FIREBASE_APP && globalAny.__FIREBASE_AUTH && globalAny.__FIREBASE_FIRESTORE) {
    return {
      firebaseApp: globalAny.__FIREBASE_APP,
      auth: globalAny.__FIREBASE_AUTH,
      firestore: globalAny.__FIREBASE_FIRESTORE
    };
  }

  const apps = getApps();
  const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  const authInstance = getAuth(app);
  
  let firestoreInstance: Firestore;
  
  // Only call initializeFirestore once
  if (apps.length === 0) {
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
      });
    } catch (e) {
      firestoreInstance = getFirestore(app);
    }
  } else {
    firestoreInstance = getFirestore(app);
  }

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
