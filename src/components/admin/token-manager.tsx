'use client';

import React from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Copy, Check } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { SignupToken } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface TokenManagerProps {
  tokens: SignupToken[];
  adminId: string;
}

export function TokenManager({ tokens, adminId }: TokenManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const handleGenerateToken = () => {
    const tokensCollection = collection(firestore, 'signup_tokens');
    const newDocRef = doc(tokensCollection);
    const newToken: Omit<SignupToken, 'id'> & { id: string, createdAt: any } = {
      id: newDocRef.id,
      status: 'active',
      createdBy: adminId,
      createdAt: serverTimestamp(),
    };
    setDocumentNonBlocking(newDocRef, newToken, {});
    toast({
      title: 'Token Generated',
      description: 'A new admin signup token has been created.',
    });
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const sortedTokens = [...tokens].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Admin Signup Tokens</CardTitle>
          <CardDescription>
            Generate one-time tokens to allow new admins to sign up.
          </CardDescription>
        </div>
        <Button onClick={handleGenerateToken} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Generate Token
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTokens.length > 0 ? (
              sortedTokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-mono flex items-center gap-2">
                    {token.id}
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
                    <Badge variant={token.status === 'active' ? 'default' : 'secondary'}>
                      {token.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {token.createdAt ? formatDistanceToNow(token.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
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
