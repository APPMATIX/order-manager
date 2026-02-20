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
import { MoreVertical, Trash2, KeyRound, Loader2, PauseCircle, PlayCircle } from 'lucide-react';
import { useAuth, sendPasswordReset, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UsersListProps {
  users: UserProfile[];
  onDelete?: (user: UserProfile) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export function UsersList({ users, onDelete, currentUserId, isAdmin }: UsersListProps) {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Pause/Status State
  const [pausingUser, setPausingUser] = useState<UserProfile | null>(null);
  const [statusRemark, setStatusRemark] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.status === 'paused') {
      // Direct reactivate
      setIsUpdatingStatus(true);
      try {
        const userRef = doc(firestore, 'users', user.id);
        await updateDoc(userRef, { status: 'active', statusRemark: '' });
        toast({ title: 'Account Activated', description: `${user.companyName} is now active.` });
      } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed' });
      } finally {
        setIsUpdatingStatus(false);
      }
    } else {
      // Open dialog for remark
      setPausingUser(user);
      setStatusRemark('');
    }
  };

  const confirmPause = async () => {
    if (!pausingUser) return;
    setIsUpdatingStatus(true);
    try {
      const userRef = doc(firestore, 'users', pausingUser.id);
      await updateDoc(userRef, { 
        status: 'paused', 
        statusRemark: statusRemark.trim() || 'Account paused by administrator.' 
      });
      toast({ 
        title: 'Account Paused', 
        description: `${pausingUser.companyName} access restricted.` 
      });
      setPausingUser(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update Failed' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const sortedUsers = [...users].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

  return (
    <>
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle>All Users</CardTitle>
        <CardDescription>A list of all vendor and admin accounts in the system.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {/* Mobile View */}
        <div className="flex flex-col gap-4 md:hidden">
          {sortedUsers.length > 0 ? (
            sortedUsers.map((user) => (
              <Card key={user.id} className={user.status === 'paused' ? 'border-destructive/20 bg-destructive/5' : ''}>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{getInitial(user.companyName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {user.companyName}
                          {user.status === 'paused' && <Badge variant="destructive" className="text-[8px] h-4">Paused</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            {user.status === 'paused' ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                            <span>{user.status === 'paused' ? 'Activate Account' : 'Pause Account'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => user.email && handleResetPassword(user.email)}
                            disabled={!!isProcessing}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            <span>Reset Password</span>
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
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-center">
                  <Badge variant={getRoleVariant(user.userType)} className="capitalize text-[10px]">
                    {user.userType}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {user.createdAt ? format(user.createdAt.toDate(), 'PP') : 'N/A'}
                  </span>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No users found.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length > 0 ? (
                sortedUsers.map((user) => (
                  <TableRow key={user.id} className={user.status === 'paused' ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>{getInitial(user.companyName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.companyName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(user.userType)} className="capitalize">{user.userType}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'paused' ? (
                        <Badge variant="destructive">Paused</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.createdAt ? format(user.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                {user.status === 'paused' ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                                <span>{user.status === 'paused' ? 'Activate Account' : 'Pause Account'}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => user.email && handleResetPassword(user.email)}
                                disabled={!!isProcessing}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>Reset Password</span>
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
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* Pause Remark Dialog */}
    <Dialog open={!!pausingUser} onOpenChange={(o) => !o && setPausingUser(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pause Account: {pausingUser?.companyName}</DialogTitle>
          <DialogDescription>
            Account access will be revoked immediately. The remark below will be shown to the user when they try to sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="remark">Reason for Pause (Remark)</Label>
            <Input 
              id="remark" 
              placeholder="e.g. Account pending verification / Payment overdue" 
              value={statusRemark}
              onChange={(e) => setStatusRemark(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPausingUser(null)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmPause} disabled={isUpdatingStatus}>
            {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Pause
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
