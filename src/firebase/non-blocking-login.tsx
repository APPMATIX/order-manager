'use client';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
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

/**
 * Re-authenticates the user and then changes their password.
 * This is a required step by Firebase for security.
 */
export async function reauthenticateAndChangePassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!user.email) {
    throw new Error('User email is not available.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);

  try {
    // Re-authenticate the user
    await reauthenticateWithCredential(user, credential);
    
    // If successful, update the password
    await updatePassword(user, newPassword);

  } catch (error: any) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('The current password you entered is incorrect.');
    }
    // Re-throw other errors
    throw error;
  }
}
