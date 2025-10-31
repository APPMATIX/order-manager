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
 * Special Handling: If login fails with 'auth/invalid-credential' for 'admin@example.com',
 * it attempts to create the user, assuming it's the first-time admin setup.
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
      // Check if it's the specific error for a non-existent user
      if (error.code === 'auth/invalid-credential') {
        // And if the user is trying to log in as the initial admin
        if (email.toLowerCase() === 'admin@example.com') {
          // Attempt to create the admin user instead.
          createUserWithEmailAndPassword(authInstance, email, password)
            .then(() => {
              toast({
                title: "Admin Account Created",
                description: "Your administrator account has been set up. You are now logged in.",
              });
            })
            .catch((createError) => {
              // This might happen if there's another issue (e.g., weak password)
              console.error("Admin account creation failed after login attempt:", createError);
              toast({
                  variant: "destructive",
                  title: "Admin Setup Failed",
                  description: createError.message || "Could not create the initial admin account.",
              });
            });
        } else {
          // For any other user, it's just an invalid login attempt.
          toast({
              variant: "destructive",
              title: "Sign In Failed",
              description: "Invalid credentials. Please check your email and password.",
          });
        }
      } else {
        // Handle other types of login errors (e.g., network issues)
        console.error("Email/password sign-in failed", error);
        toast({
            variant: "destructive",
            title: "Sign In Failed",
            description: error.message || "An unexpected error occurred during sign-in.",
        });
      }
    });
}
