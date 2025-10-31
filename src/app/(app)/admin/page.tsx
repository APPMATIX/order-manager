
'use client';

import React from 'react';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, KeyRound, Loader2, Users, Shield } from 'lucide-react';
import type { SignupToken, UserProfile } from '@/lib/types';
import { useUserProfile } from '@/context/UserProfileContext';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { TokenList } from '@/components/admin/token-list';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorList } from '@/components/admin/vendor-list';

// This component is now responsible for fetching and displaying admin-specific data.
// It should only be rendered *after* the parent has confirmed the user is an admin.
function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const tokensCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'signup_tokens') : null),
    [firestore]
  );

  const { data: tokens, isLoading: areTokensLoading } = useCollection<SignupToken>(tokensCollection);

  const vendorsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users'), where('userType', '==', 'vendor')) : null),
    [firestore]
  );
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<UserProfile>(vendorsQuery);

  const handleGenerateToken = () => {
    if (!tokensCollection) return;

    addDocumentNonBlocking(tokensCollection, {
      createdAt: serverTimestamp(),
      used: false,
    });

    toast({
      title: 'Token Generated',
      description: 'A new signup token has been successfully created.',
    });
  };
  
  const isLoading = areTokensLoading || areVendorsLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Admin Panel</h1>
         <Button onClick={handleGenerateToken} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Generate Token
        </Button>
      </div>

       <Tabs defaultValue="vendors" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vendors">
            <Users className="mr-2 h-4 w-4" />
            Vendors ({vendors?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <KeyRound className="mr-2 h-4 w-4" />
            Signup Tokens ({tokens?.length || 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="vendors">
           <Card>
            <CardHeader>
              <CardTitle>Vendor Management</CardTitle>
              <CardDescription>
                Search and view all registered vendors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : vendors && vendors.length > 0 ? (
                <VendorList vendors={vendors} />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                    <Users className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Vendors Found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Once vendors sign up using a token, they will appear here.
                    </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Signup Tokens</CardTitle>
              <CardDescription>
                Generate and manage one-time tokens for new vendor signups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : tokens && tokens.length > 0 ? (
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
        </TabsContent>
      </Tabs>
    </>
  );
}

// This is the main page component. Its only job is to check auth status.
export default function AdminPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  // 1. Show a loading spinner while we wait for the user profile to be determined.
  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // 2. Once loaded, if the user is NOT an admin, show the access denied message.
  if (userProfile?.userType !== 'admin') {
       return (
       <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center"><Shield className="mr-2 h-6 w-6 text-destructive" />Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page. This area is for administrators only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 3. Only if the user IS an admin, render the dashboard component that fetches data.
  return <AdminDashboard />;
}
