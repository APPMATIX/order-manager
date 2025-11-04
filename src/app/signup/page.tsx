
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, writeBatch, getDoc, Timestamp, collection, query, where } from "firebase/firestore";
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
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { UserProfile, SignupToken } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const signupSchema = z
  .object({
    accountType: z.enum(['vendor', 'admin', 'client']),
    companyName: z.string().min(1, { message: "Name or company name is required." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
    token: z.string().optional(),
    vendorId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.accountType !== 'admin' || (!!data.token && data.token.length > 0), {
      message: "A signup token is required for admin accounts.",
      path: ["token"],
  })
  .refine((data) => data.accountType !== 'client' || (!!data.vendorId && data.vendorId.length > 0), {
    message: "Please select a vendor.",
    path: ["vendorId"],
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
      vendorId: "",
    },
  });

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('userType', '==', 'vendor'));
  }, [firestore]);

  const { data: vendors, isLoading: vendorsLoading } = useCollection<UserProfile>(vendorsQuery);

  const watchAccountType = form.watch("accountType");

  const getPageDescription = () => {
    switch(watchAccountType) {
      case 'vendor': return 'Enter your details to create a vendor account.';
      case 'admin': return 'Enter your details and admin token to get started.';
      case 'client': return 'Register to start placing orders with your vendor.';
      default: return '';
    }
  }

  const getFormLabel = () => {
     switch(watchAccountType) {
      case 'vendor': return 'Company Name';
      case 'admin': return 'Full Name';
      case 'client': return 'Your Name / Company Name';
      default: return 'Name';
    }
  }

  const getFormPlaceholder = () => {
     switch(watchAccountType) {
      case 'vendor': return 'Acme Inc.';
      case 'admin': return 'John Doe';
      case 'client': return 'Johns Trading';
      default: return 'Name';
    }
  }


  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);

    try {
      if (!firestore) throw new Error("Firestore not available");
      
      const userType: UserProfile['userType'] = data.accountType;

      // Handle admin token validation
      if (userType === 'admin') {
        if (!data.token) {
          throw new Error("A signup token is required to create an admin account.");
        }
        const tokenRef = doc(firestore, "signup_tokens", data.token);
        const tokenSnap = await getDoc(tokenRef);
        const tokenData = tokenSnap.data() as SignupToken | undefined;

        if (!tokenSnap.exists() || !tokenData || tokenData.status !== 'active' || isPast(tokenData.expiresAt.toDate())) {
          throw new Error("The signup token is invalid, used, or expired.");
        }
        if (tokenData.role !== 'admin') {
          throw new Error(`This token is not valid for creating an admin account.`);
        }
      }

      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Create user profile document and update token if needed
      if (user) {
        const batch = writeBatch(firestore);
        const userDocRef = doc(firestore, "users", user.uid);
        
        const userData: Partial<UserProfile> & { id: string, email: string | null, userType: UserProfile['userType'], companyName: string, createdAt: any } = {
          id: user.uid,
          email: user.email,
          userType: userType,
          companyName: data.companyName,
          createdAt: Timestamp.now(),
        };

        if (userType === 'client') {
            userData.vendorId = data.vendorId;
        }
        
        batch.set(userDocRef, userData);

        if (userType === 'admin' && data.token) {
            const tokenRef = doc(firestore, "signup_tokens", data.token);
            batch.update(tokenRef, {
              status: 'used',
              usedBy: user.uid,
              usedAt: Timestamp.now(),
            });
        }
        
        await batch.commit();
      }

      toast({
        title: "Account Created!",
        description: `Welcome, ${data.companyName}! You're ready to get started.`,
      });

      router.push("/dashboard");

    } catch (error: any) {
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already in use by another account.";
      } else if (error.code === 'auth/weak-password') {
        description = "The password is too weak. Please choose a stronger password.";
      } else {
        description = error.message;
      }

      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: description,
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
          <CardTitle className="text-2xl">Create an Account</CardTitle>
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
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getFormLabel()}</FormLabel>
                    <FormControl>
                      <Input placeholder={getFormPlaceholder()} {...field} />
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
              
              {watchAccountType === 'admin' && (
                <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Admin Signup Token</FormLabel>
                        <FormControl>
                        <Input placeholder="Enter your one-time token" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}

              {watchAccountType === 'client' && (
                 <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Select Your Vendor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={vendorsLoading}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select a vendor"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {vendors?.map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>{vendor.companyName}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}

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
                 Already have an account?
                <Button variant="link" asChild>
                    <Link href="/login">Sign in</Link>
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
