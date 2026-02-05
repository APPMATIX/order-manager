
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { useAuth, sendPasswordReset } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface UsersListProps {
  users: UserProfile[];
  onDelete?: (user: UserProfile) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function UsersList({ users, onDelete, currentUserId, isAdmin }: UsersListProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const getInitial = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getRoleVariant = (role: UserProfile['userType']) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'vendor':
      default:
        return 'secondary';
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    setIsProcessing(email);
    try {
      await sendPasswordReset(auth, email);
      toast({
        title: 'Reset Link Sent',
        description: `Password reset instructions sent to ${email}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message || 'Could not send reset link.',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const sortedUsers = [...users].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
        <CardDescription>A list of all vendor and admin accounts in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length > 0 ? (
              sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.photoURL || ''} />
                        <AvatarFallback>{getInitial(user.companyName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.companyName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(user.userType)}>{user.userType}</Badge>
                  </TableCell>
                  <TableCell>{user.createdAt ? format(user.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => user.email && handleResetPassword(user.email)}
                            disabled={!!isProcessing}
                          >
                            {isProcessing === user.email ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="mr-2 h-4 w-4" />
                            )}
                            <span>Send Reset Link</span>
                          </DropdownMenuItem>
                          {user.id !== currentUserId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onDelete?.(user)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete User</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
