'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SignupToken } from '@/lib/types';

interface TokenListProps {
  tokens: SignupToken[];
}

export function TokenList({ tokens }: TokenListProps) {
  const { toast } = useToast();
  const [copiedTokenId, setCopiedTokenId] = React.useState<string | null>(null);

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(token);
    toast({ title: "Token Copied!", description: "The signup token has been copied to your clipboard." });
    setTimeout(() => setCopiedTokenId(null), 2000);
  };
  
  const sortedTokens = tokens.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return (
    <div className="overflow-x-auto">
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
          {sortedTokens.map((token) => (
            <TableRow key={token.id}>
              <TableCell className="font-mono text-xs">{token.id}</TableCell>
              <TableCell>{token.createdAt?.toDate().toLocaleString()}</TableCell>
              <TableCell>
                {token.used ? (
                  <Badge variant="secondary">Used</Badge>
                ) : (
                  <Badge variant="default">Available</Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{token.usedBy || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(token.id)}
                    disabled={token.used}
                >
                  {copiedTokenId === token.id ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Copy
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
