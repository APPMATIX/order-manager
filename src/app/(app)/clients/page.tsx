'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
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
import { useUserProfile } from '@/hooks/useUserProfile';

export default function ClientsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const clientsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'clients') : null),
    [firestore, user]
  );

  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsCollection);

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
    if (!clientsCollection || !user) return;

    if (selectedClient) {
      const clientDoc = doc(firestore, 'users', user.uid, 'clients', selectedClient.id);
      updateDocumentNonBlocking(clientDoc, formData);
    } else {
      addDocumentNonBlocking(clientsCollection, {
        ...formData,
        createdAt: serverTimestamp(),
      });
    }
    handleFormClose();
  };
  
  const isLoading = isProfileLoading || areClientsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userProfile?.userType !== 'vendor') {
    return (
       <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>This area is for vendors only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }


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
