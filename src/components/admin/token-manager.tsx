
'use client';

import React, { useState } from 'react';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Copy, Check, Keyboard, Shield, Briefcase } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { SignupToken } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isPast } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TokenManagerProps {
  tokens: SignupToken[];
  adminId: string;
}

export function TokenManager({ tokens, adminId }: TokenManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [tokenRole, setTokenRole] = useState<'vendor' | 'admin'>('vendor');

  const handleCreateToken = (customId?: string) => {
    if (!firestore) return;
    
    const tokenToCreate = customId?.trim() || '';
    const tokensCollection = collection(firestore, 'signup_tokens');
    const newDocRef = tokenToCreate ? doc(tokensCollection, tokenToCreate) : doc(tokensCollection);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const newToken: any = {
      id: newDocRef.id,
      role: tokenRole,
      status: 'active',
      createdBy: adminId,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    setDocumentNonBlocking(newDocRef, newToken, { merge: true });
    
    toast({
      title: 'Token Created',
      description: `Token "${newDocRef.id}" for ${tokenRole} is ready.`,
    });

    if (customId) {
        setManualToken('');
    }
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };
  
  const getTokenStatus = (token: SignupToken): { status: string, variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (token.status !== 'active') {
        return { status: token.status, variant: 'secondary' };
    }
    if (token.expiresAt && isPast(token.expiresAt.toDate())) {
        return { status: 'expired', variant: 'destructive' };
    }
    return { status: 'active', variant: 'default' };
  }

  const sortedTokens = [...tokens].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue Signup Token</CardTitle>
          <CardDescription>
            Generate a secure link or type a custom one. Tokens are mandatory for registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Custom Token ID (Optional)</label>
                    <Input 
                        placeholder="e.g. admin2025" 
                        value={manualToken} 
                        onChange={(e) => setManualToken(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-40 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Account Type</label>
                    <Select value={tokenRole} onValueChange={(val: any) => setTokenRole(val)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                        onClick={() => handleCreateToken(manualToken)} 
                        disabled={!manualToken.trim()}
                        variant="secondary"
                        className="flex-1 sm:flex-none"
                    >
                        <Keyboard className="mr-2 h-4 w-4" />
                        Type Custom
                    </Button>
                    <Button onClick={() => handleCreateToken()} className="flex-1 sm:flex-none">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Random
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Invitations</CardTitle>
          <CardDescription>
            Valid tokens required for Vendor and Admin signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
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
                            <span className="truncate max-w-[150px] sm:max-w-xs font-bold">{token.id}</span>
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
                            <div className="flex items-center gap-1.5">
                                {token.role === 'admin' ? <Shield className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                                <span className="capitalize text-xs">{token.role}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={variant} className="text-[10px]">
                              {status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                            {status === 'active' && token.expiresAt ? (
                                 <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span className="cursor-help underline decoration-dotted">
                                                {formatDistanceToNow(token.expiresAt.toDate(), { addSuffix: true })}
                                            </span>
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
                    <TableCell colSpan={4} className="h-24 text-center">
                      No tokens issued yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
