
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// Use a global cache to ensure we only initialize once per client session.
// This prevents the "ca9" internal assertion failure during hot-reloads.
const globalCache = (globalThis as any);

export function initializeFirebase() {
  if (!globalCache._firebaseApp) {
    const apps = getApps();
    globalCache._firebaseApp = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  
  const app = globalCache._firebaseApp;

  if (!globalCache._firebaseAuth) {
    globalCache._firebaseAuth = getAuth(app);
  }

  if (!globalCache._firebaseFirestore) {
    try {
      // In development environments, multiple initializations can cause crashes.
      // We explicitly enable long polling to handle network stream restrictions.
      globalCache._firebaseFirestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // Fallback if initializeFirestore was already called elsewhere
      globalCache._firebaseFirestore = getFirestore(app);
    }
  }

  return {
    firebaseApp: app,
    auth: globalCache._firebaseAuth,
    firestore: globalCache._firebaseFirestore
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
