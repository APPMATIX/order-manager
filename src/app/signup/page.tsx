
"use client";

import { useState } from "react";
import Link from "next/navigation";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, writeBatch, getDoc, Timestamp, collection } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isPast } from 'date-fns';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Box } from "lucide-react";
import { useAuth, useFirestore } from "@/firebase";
import type { UserProfile, SignupToken } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES, CountryCode } from "@/lib/country-config";

const signupSchema = z
  .object({
    accountType: z.enum(['vendor', 'admin']),
    country: z.custom<CountryCode>(val => Object.keys(COUNTRIES).includes(val as string), {
        message: "Please select a country.",
    }).optional(),
    companyName: z.string().min(1, { message: "Name or company name is required." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
    token: z.string().min(1, { message: "A valid invitation token is required to register." }),
    trn: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
   .refine((data) => data.accountType !== 'vendor' || !!data.country, {
      message: "Please select your country.",
      path: ["country"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      accountType: 'vendor',
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
      token: "",
      trn: "",
    },
  });

  const watchAccountType = form.watch("accountType");
  const watchCountry = form.watch("country") || 'AE';
  const countryConfig = COUNTRIES[watchCountry as CountryCode];

  const getPageDescription = () => {
    switch(watchAccountType) {
      case 'vendor': return 'Enter your details and invitation token to create a vendor account.';
      case 'admin': return 'Enter your details and admin token to get started.';
      default: return '';
    }
  }

  const getFormLabel = () => {
     switch(watchAccountType) {
      case 'vendor': return 'Company Name';
      case 'admin': return 'Full Name';
      default: return 'Name';
    }
  }

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);

    try {
      if (!firestore) throw new Error("Firestore not available");
      
      const userType: 'vendor' | 'admin' = data.accountType;

      // 1. Mandatory Token Verification
      const tokenRef = doc(firestore, "signup_tokens", data.token);
      const tokenSnap = await getDoc(tokenRef);
      const tokenData = tokenSnap.data() as SignupToken | undefined;

      if (!tokenSnap.exists()) {
        throw new Error("The invitation token provided is invalid.");
      }

      if (!tokenData || tokenData.status !== 'active') {
        throw new Error("This token has already been used or is inactive.");
      }

      if (tokenData.expiresAt && isPast(tokenData.expiresAt.toDate())) {
        throw new Error("The invitation token has expired.");
      }
      
      // Token role verification
      if (tokenData.role !== userType) {
         throw new Error(`This token is specifically for ${tokenData.role} accounts, but you are creating a ${userType} account.`);
      }

      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 3. Create user profile document and update token status
      if (user) {
        const batch = writeBatch(firestore);
        const userDocRef = doc(firestore, "users", user.uid);
        
        const userData: Partial<UserProfile> = {
          id: user.uid,
          email: user.email,
          userType: userType,
          companyName: data.companyName,
          country: data.country || 'AE',
          trn: data.trn,
          createdAt: Timestamp.now(),
        };

        if (userType === 'vendor') {
          const vendorPublicRef = doc(firestore, 'vendors', user.uid);
          batch.set(vendorPublicRef, {
            id: user.uid,
            name: data.companyName,
          });
        }
        
        batch.set(userDocRef, userData);

        // Mark token as used
        batch.update(tokenRef, {
          status: 'used',
          usedBy: user.uid,
          usedAt: Timestamp.now(),
        });
        
        await batch.commit();
      }

      toast({
        title: "Account Created!",
        description: `Welcome, ${data.companyName}! Your registration is complete.`,
      });

      router.push("/dashboard");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "An unexpected error occurred during registration.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center animated-gradient p-4">
      <Card className="w-full max-w-md border-0 shadow-lg sm:border">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Box className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            {getPageDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I am a...</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Invitation Token (Required)</FormLabel>
                      <FormControl>
                      <Input placeholder="Enter your unique invite code" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />

              {watchAccountType === 'vendor' && (
                  <>
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    control={form.control}
                    name="trn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{countryConfig.taxIdName} ({countryConfig.taxIdLabel})</FormLabel>
                        <FormControl>
                          <Input placeholder={`Enter your ${countryConfig.taxIdLabel}`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </>
              )}

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getFormLabel()}</FormLabel>
                    <FormControl>
                      <Input placeholder={watchAccountType === 'vendor' ? 'Acme Inc.' : 'John Doe'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-center justify-center text-sm gap-2">
            <div>
                 Already registered?
                <Button variant="link" asChild>
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
