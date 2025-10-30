'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth, useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Loader2 } from 'lucide-react';
import { ClientForm } from '@/components/clients/client-form';
import { ClientTable } from '@/components/clients/client-table';
import type { Client } from '@/lib/types';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function ClientsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();

  const clientsCollection = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'clients') : null,
    [firestore, user]
  );
  
  const { data: clients, isLoading } = useCollection<Client>(clientsCollection);

  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedClient(null);
  };

  const handleFormSubmit = (formData: Omit<Client, 'id' | 'createdAt'>) => {
    if (!clientsCollection) return;

    if (selectedClient) {
      // Update existing client
      const clientDoc = doc(firestore, 'users', user!.uid, 'clients', selectedClient.id);
      updateDocumentNonBlocking(clientDoc, formData);
    } else {
      // Add new client
      addDocumentNonBlocking(clientsCollection, {
        ...formData,
        createdAt: serverTimestamp(),
      });
    }
    handleFormClose();
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Clients</CardTitle>
              <CardDescription>
                Manage your client information and credit details.
              </CardDescription>
            </div>
            <Button onClick={handleAddClient}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isFormOpen ? (
            <ClientForm
              client={selectedClient}
              onSubmit={handleFormSubmit}
              onCancel={handleFormClose}
            />
          ) : isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : clients && clients.length > 0 ? (
            <ClientTable clients={clients} onEdit={handleEditClient} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Clients Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Click "Add Client" to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
