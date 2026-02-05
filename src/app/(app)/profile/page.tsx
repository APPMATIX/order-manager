
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
import { useFirestore, useUser, useAuth, reauthenticateAndChangePassword } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCountry } from '@/context/CountryContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES, CountryCode } from '@/lib/country-config';

const profileSchema = z.object({
  companyName: z.string().min(1, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  trn: z.string().optional(),
  address: z.string().optional(),
  billingAddress: z.string().optional(),
  phone: z.string().optional(),
  website: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.toLowerCase().includes('www'), {
      message: "Please enter a valid URL containing 'www'."
    }),
  country: z.custom<CountryCode>().optional(),
  photoURL: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { countryConfig } = useCountry();

  const isVendor = userProfile?.userType === 'vendor';
  const isAdminOrClient = userProfile?.userType === 'admin' || userProfile?.userType === 'client';

  const nameLabel = isAdminOrClient ? 'Full Name' : 'Company Name';

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: '',
      email: '',
      trn: '',
      address: '',
      billingAddress: '',
      phone: '',
      website: '',
      country: 'AE',
      photoURL: '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        companyName: userProfile.companyName || '',
        email: userProfile.email || '',
        trn: userProfile.trn || '',
        address: userProfile.address || '',
        billingAddress: userProfile.billingAddress || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        country: userProfile.country || 'AE',
        photoURL: userProfile.photoURL || '',
      });
      setAvatarPreview(userProfile.photoURL || null);
    }
  }, [userProfile, profileForm]);
  
  const getInitial = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
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
        profileForm.setValue('photoURL', dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user || !firestore) return;
    setIsSubmittingProfile(true);

    try {
        const { email, ...updateData } = data; // email is not editable
        const batch = writeBatch(firestore);

        // Update private user profile
        const userDocRef = doc(firestore, 'users', user.uid);
        batch.update(userDocRef, updateData);

        // If user is a vendor, update the public vendor document as well
        if (isVendor) {
            const vendorPublicRef = doc(firestore, 'vendors', user.uid);
            // Use set with merge: true to avoid "document not found" errors if it was missing
            batch.set(vendorPublicRef, { 
              id: user.uid,
              name: data.companyName 
            }, { merge: true });
        }
        
        await batch.commit();

        toast({
            title: 'Profile Updated',
            description: 'Your details have been saved.',
        });
        
        if (userProfile?.country !== data.country) {
            // Give Firebase a moment to sync before reload to apply new country config
            setTimeout(() => window.location.reload(), 1500);
        }
    } catch(error) {
        console.error("Profile update failed: ", error);
        toast({
            variant: "destructive",
            title: 'Update Failed',
            description: 'Could not save your profile changes.',
        });
    } finally {
        setIsSubmittingProfile(false);
    }
  };
  
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user) return;
    setIsSubmittingPassword(true);
    
    try {
      await reauthenticateAndChangePassword(user, data.currentPassword, data.newPassword);
      toast({
        title: 'Password Changed',
        description: 'Your password has been successfully updated.',
      });
      passwordForm.reset();
    } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Password Change Failed',
          description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmittingPassword(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl">Profile Settings</h1>
      </div>
      <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{isVendor ? 'Company Details' : 'Personal Details'}</CardTitle>
          <CardDescription>
            Update your information. {isVendor && 'This will be reflected on your invoices and client portal.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
              <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={avatarPreview || ''} alt="User avatar" />
                      <AvatarFallback className="text-3xl">
                        {getInitial(userProfile?.companyName)}
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
                  control={profileForm.control}
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
                  control={profileForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{nameLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder={isVendor ? 'Your Company LLC' : 'John Doe'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            {isVendor && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                      control={profileForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => (
                                  <SelectItem key={code} value={code}>
                                      {COUNTRIES[code].name}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={profileForm.control}
                    name="trn"
                    render={({ field }) => {
                      const selectedCountry = profileForm.watch('country') || 'AE';
                      const currentLabels = COUNTRIES[selectedCountry as CountryCode];
                      return (
                        <FormItem>
                          <FormLabel>{currentLabels.taxIdName} ({currentLabels.taxIdLabel})</FormLabel>
                          <FormControl>
                            <Input placeholder={`Enter your ${currentLabels.taxIdLabel}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <FormField
                  control={profileForm.control}
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
                  control={profileForm.control}
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
                    control={profileForm.control}
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
                    control={profileForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="www.yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingProfile}>
                  {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
       <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmittingPassword}>
                    {isSubmittingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Change Password
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
