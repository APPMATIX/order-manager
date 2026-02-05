
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// Use a global cache to ensure we only initialize once per client session.
// This prevents the "ca9" internal assertion failure during hot-reloads.
const globalCache = (globalThis as any);

export function initializeFirebase() {
  // 1. App singleton
  if (!globalCache._firebaseApp) {
    const apps = getApps();
    globalCache._firebaseApp = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  
  const app = globalCache._firebaseApp as FirebaseApp;

  // 2. Auth singleton
  if (!globalCache._firebaseAuth) {
    globalCache._firebaseAuth = getAuth(app);
  }

  // 3. Firestore singleton
  if (!globalCache._firebaseFirestore) {
    // In many development environments, multiple initializations with different settings can cause crashes.
    // We attempt initializeFirestore first with explicit settings, then fallback to getFirestore.
    try {
      globalCache._firebaseFirestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // If initializeFirestore fails (e.g., already initialized), we get the existing instance.
      globalCache._firebaseFirestore = getFirestore(app);
    }
  }

  return {
    firebaseApp: app,
    auth: globalCache._firebaseAuth as Auth,
    firestore: globalCache._firebaseFirestore as Firestore
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
