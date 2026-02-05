
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, KeyRound, Mail, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth, sendPasswordReset } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

interface SecurityManagerProps {
  users: UserProfile[];
}

export function SecurityManager({ users }: SecurityManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const auth = useAuth();
  const { toast } = useToast();

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    
    setIsProcessing(email);
    try {
      await sendPasswordReset(auth, email);
      toast({
        title: 'Reset Link Sent',
        description: `A password reset link has been dispatched to ${email}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message || 'Could not initiate password reset.',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Password Management</CardTitle>
          <CardDescription>
            Administrators can initiate password resets for any registered user. For security, standard protocol requires users to set their own passwords via a verified link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="text-right">Security Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{user.companyName}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs">
                        {user.userType}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => user.email && handleResetPassword(user.email)}
                          disabled={!!isProcessing || !user.email}
                        >
                          {isProcessing === user.email ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <KeyRound className="mr-2 h-3 w-3" />
                          )}
                          Reset Password
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No matching users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="flex flex-row items-center gap-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          <div>
            <CardTitle className="text-sm">Administrative Security Protocol</CardTitle>
            <CardDescription className="text-xs">
              Directly setting user passwords is restricted to ensure end-to-end security. Use the reset mechanism above to allow users to securely update their credentials.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
