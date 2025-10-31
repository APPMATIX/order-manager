
'use client';
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { SignupToken } from '@/lib/types';

interface TokenListProps {
  tokens: SignupToken[];
}

export function TokenList({ tokens }: TokenListProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const generateToken = () => {
    const tokensCollection = collection(firestore, 'signup_tokens');
    const newDocRef = doc(tokensCollection);
    
    setDocumentNonBlocking(newDocRef, {
        id: newDocRef.id,
        createdAt: serverTimestamp(),
        isUsed: false,
    }, {});
    
    toast({ title: 'Token Generated', description: 'A new signup token has been created.' });
  };
  
  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(token);
    toast({ title: 'Copied to Clipboard!' });
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const sortedTokens = [...tokens].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={generateToken} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Generate Token
        </Button>
      </div>

       {/* Mobile View */}
        <div className="md:hidden space-y-4">
            {sortedTokens.map((token) => (
                <Card key={token.id}>
                    <CardHeader>
                        <CardTitle className="truncate text-lg font-mono">{token.id}</CardTitle>
                        <CardDescription>
                            Created: {token.createdAt?.toDate().toLocaleString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={token.isUsed ? 'secondary' : 'default'}>
                                {token.isUsed ? 'Used' : 'Available'}
                            </Badge>
                        </div>
                        {token.isUsed && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Used by</span>
                                <span className="truncate">{token.usedBy}</span>
                            </div>
                        )}
                        <Button
                            onClick={() => copyToClipboard(token.id)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={token.isUsed}
                        >
                            {copiedTokenId === token.id ? (
                                <Check className="mr-2 h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="mr-2 h-4 w-4" />
                            )}
                            {copiedTokenId === token.id ? 'Copied!' : 'Copy Token'}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>


      {/* Desktop View */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTokens.length > 0 ? sortedTokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell className="font-mono">{token.id}</TableCell>
                <TableCell>{token.createdAt?.toDate().toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={token.isUsed ? 'secondary' : 'default'}>
                    {token.isUsed ? 'Used' : 'Available'}
                  </Badge>
                </TableCell>
                 <TableCell>{token.usedBy || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(token.id)}
                    disabled={token.isUsed}
                  >
                    {copiedTokenId === token.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No tokens found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    