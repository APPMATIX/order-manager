'use client';

import React from 'react';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, KeyRound, Loader2 } from 'lucide-react';
import type { SignupToken } from '@/lib/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { TokenList } from '@/components/admin/token-list';
import { useToast } from '@/hooks/use-toast';


export default function AdminPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

  const tokensCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'signup_tokens') : null),
    [firestore]
  );

  const { data: tokens, isLoading: areTokensLoading } = useCollection<SignupToken>(tokensCollection);
  
  const handleGenerateToken = () => {
    if (!tokensCollection) return;
    
    // Firestore will auto-generate an ID for the new document
    addDocumentNonBlocking(tokensCollection, {
        createdAt: serverTimestamp(),
        used: false,
    });
    
    toast({
        title: "Token Generated",
        description: "A new signup token has been successfully created."
    })
  };

  const isLoading = isProfileLoading || areTokensLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (userProfile?.userType !== 'admin') {
       return (
       <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. This area is for administrators only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }


  return (
    <>
      <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Admin Panel</h1>
          <Button onClick={handleGenerateToken} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Generate Token
          </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Signup Tokens</CardTitle>
            <CardDescription>
            Generate and manage one-time tokens for new vendor signups.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens && tokens.length > 0 ? (
            <TokenList tokens={tokens} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <KeyRound className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Tokens Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Click "Generate Token" to create the first signup token.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
