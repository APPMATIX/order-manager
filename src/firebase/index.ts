
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// Using module-level variables to ensure a true singleton pattern in Next.js
let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

export function initializeFirebase() {
  // 1. App singleton
  if (!appInstance) {
    const apps = getApps();
    appInstance = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  // 2. Auth singleton
  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }

  // 3. Firestore singleton
  if (!dbInstance) {
    // Attempt to initialize with specific settings to prevent conflicting initializations
    try {
      dbInstance = initializeFirestore(appInstance, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // Fallback if already initialized by another module
      dbInstance = getFirestore(appInstance);
    }
  }

  return {
    firebaseApp: appInstance,
    auth: authInstance,
    firestore: dbInstance
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
