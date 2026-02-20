
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
import { Loader2, Pencil, Fingerprint, Mail, Building2, User as UserIcon } from 'lucide-react';
import { useFirestore, useUser, useAuth, reauthenticateAndChangePassword } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useUserProfile } from '@/context/UserProfileContext';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCountry } from '@/context/CountryContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES, CountryCode } from '@/lib/country-config';
import { Badge } from '@/components/ui/badge';

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Profile Settings</h1>
        <Badge variant="outline" className="capitalize px-3 py-1 bg-primary/5 border-primary/20 text-primary font-bold">
          {userProfile?.userType || 'User'} Account
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account ID Sidebar Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border-primary/10 shadow-md">
            <div className="bg-primary h-24 relative">
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                      <AvatarImage src={avatarPreview || undefined} alt="User avatar" />
                      <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
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
            </div>
            <CardContent className="pt-16 pb-6 text-center">
              <h3 className="text-xl font-black">{userProfile?.companyName || 'Anonymous User'}</h3>
              <p className="text-sm text-muted-foreground mb-6">{user?.email}</p>
              
              <div className="space-y-4 text-left border-t pt-6">
                <div className="flex items-start gap-3">
                  <Fingerprint className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">User ID (System ID)</p>
                    <p className="text-xs font-mono break-all">{user?.uid}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Login Email</p>
                    <p className="text-xs">{user?.email}</p>
                  </div>
                </div>
                {isVendor && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Legal Status</p>
                      <p className="text-xs">Registered Vendor ({userProfile?.country})</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                {isVendor ? 'Company Details' : 'Personal Details'}
              </CardTitle>
              <CardDescription>
                Update your identity information. This affects your invoices and client portal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+971..." {...field} />
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
                              <FormLabel>Region / Country</FormLabel>
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
                          <FormLabel>Operating Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Street, City, Country" className="min-h-[80px]" {...field} />
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
                          <FormLabel>Billing Address (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Official billing address or P.O. Box" className="min-h-[80px]" {...field} />
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
                  </>
                )}

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={isSubmittingProfile} className="min-w-[150px]">
                      {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Profile
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="shadow-md border-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">Change Password</CardTitle>
              <CardDescription>
                Update your account security credentials.
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
                        <FormLabel>Existing Password</FormLabel>
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
                          <FormLabel>New Secure Password</FormLabel>
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
                          <FormLabel>Verify New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" variant="destructive" disabled={isSubmittingPassword}>
                      {isSubmittingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
