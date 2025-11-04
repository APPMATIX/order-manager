
'use client';

import React, { useState } from 'react';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Copy, Check, AlertTriangle } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { SignupToken, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isPast } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TokenManagerProps {
  tokens: SignupToken[];
  adminId: string;
}

export function TokenManager({ tokens, adminId }: TokenManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const handleGenerateToken = () => {
    if (!firestore) return;
    const tokensCollection = collection(firestore, 'signup_tokens');
    const newDocRef = doc(tokensCollection);
    
    const role: UserProfile['userType'] = 'admin';

    // Set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    const newToken: Omit<SignupToken, 'id' | 'createdAt' | 'expiresAt'> & { id: string, createdAt: any, expiresAt: any } = {
      id: newDocRef.id,
      role: role,
      status: 'active',
      createdBy: adminId,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };
    setDocumentNonBlocking(newDocRef, newToken, {});
    toast({
      title: 'Token Generated',
      description: `A new ${role} signup token has been created and will expire in 10 minutes.`,
    });
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopiedToken(null), 2000);
    });
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
  
  const getTokenStatus = (token: SignupToken): { status: SignupToken['status'] | 'expired', variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (token.status !== 'active') {
        return { status: token.status, variant: 'secondary' };
    }
    // Check if expiresAt exists and if it's in the past
    if (!token.expiresAt || isPast(token.expiresAt.toDate())) {
        return { status: 'expired', variant: 'destructive' };
    }
    return { status: 'active', variant: 'default' };
  }

  const sortedTokens = [...tokens].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Admin Signup Tokens</CardTitle>
          <CardDescription>
            Generate one-time tokens for new admins. Tokens expire in 10 minutes.
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleGenerateToken}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Generate Admin Token
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTokens.length > 0 ? (
              sortedTokens.map((token) => {
                  const { status, variant } = getTokenStatus(token);
                  return (
                    <TableRow key={token.id}>
                    <TableCell className="font-mono flex items-center gap-2">
                        <span className="truncate max-w-xs">{token.id}</span>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(token.id)}
                        >
                        {copiedToken === token.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        </Button>
                    </TableCell>
                    <TableCell>
                        <Badge variant={getRoleVariant(token.role)}>{token.role}</Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={variant}>
                          {status}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        {token.createdAt ? formatDistanceToNow(token.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                        {status === 'active' && token.expiresAt ? (
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span>{formatDistanceToNow(token.expiresAt.toDate(), { addSuffix: true })}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{token.expiresAt.toDate().toLocaleString()}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : ('-')}
                    </TableCell>
                    </TableRow>
                  )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No tokens generated yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
