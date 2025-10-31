
'use client';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInWithEmailAndPassword(authInstance, 'anonymous@example.com', 'password').catch((error) => {
    console.error("Anonymous sign-in failed", error);
    toast({
        variant: 'destructive',
        title: 'Sign-in Failed',
        description: error.message || 'Could not sign in anonymously.',
    });
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((error) => {
    console.error("Email/password sign-up failed", error);
    toast({
        variant: 'destructive',
        title: 'Sign-up Failed',
        description: error.message || 'Could not create account.',
    });
  });
}

/** 
 * Initiate email/password sign-in (non-blocking).
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
        console.error("Email/password sign-in failed", error);
        toast({
            variant: "destructive",
            title: "Sign In Failed",
            description: "Invalid credentials. Please check your email and password.",
        });
    });
}
