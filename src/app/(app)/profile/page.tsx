
'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import type { UserProfile } from '@/lib/types';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const profileSchema = z.object({
  companyName: z.string().min(1, { message: 'Company name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  trn: z.string().optional(),
  address: z.string().optional(),
  billingAddress: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  photoURL: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const isVendor = userProfile?.userType === 'vendor';

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: '',
      email: '',
      trn: '',
      address: '',
      billingAddress: '',
      phone: '',
      website: '',
      photoURL: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        companyName: userProfile.companyName || '',
        email: userProfile.email || '',
        trn: userProfile.trn || '',
        address: userProfile.address || '',
        billingAddress: userProfile.billingAddress || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        photoURL: userProfile.photoURL || '',
      });
      setAvatarPreview(userProfile.photoURL || null);
    }
  }, [userProfile, form]);
  
  const getInitial = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'V';
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please upload an image smaller than 1MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setAvatarPreview(dataUri);
        form.setValue('photoURL', dataUri);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = (data: ProfileFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    const userDocRef = doc(firestore, 'users', user.uid);
    const { email, ...updateData } = data; // email is not editable

    updateDocumentNonBlocking(userDocRef, updateData);

    toast({
      title: 'Profile Updated',
      description: 'Your details have been saved.',
    });
    setIsSubmitting(false);
  };

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Could not load user profile.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Profile Settings</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            Update your information. This will be reflected on your invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={avatarPreview || ''} alt="User avatar" />
                      <AvatarFallback className="text-3xl">
                        {getInitial(userProfile.companyName)}
                      </AvatarFallback>
                    </Avatar>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity"
                      onClick={handleAvatarClick}
                    >
                      <Pencil className="h-6 w-6" />
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileChange}
                    />
                  </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@yourcompany.com" {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder={'Your Company LLC'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            {isVendor && (
              <>
                <FormField
                  control={form.control}
                  name="trn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Registration Number (TRN)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 100..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Street, City, Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="billingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Your P.O. Box or full billing address" {...field} />
                      </FormControl>
                       <FormDescription>
                         This will appear on your invoices if provided.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+971..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

    
