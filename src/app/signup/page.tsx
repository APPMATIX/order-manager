"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, writeBatch, getDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import type { UserProfile } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SUPER_ADMIN_EMAIL = 'kevinparackal10@gmail.com';

const signupSchema = z
  .object({
    accountType: z.enum(['vendor', 'admin']),
    companyName: z.string().min(1, { message: "Name or company name is required." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
    token: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.accountType !== 'admin' || (data.token && data.token.length > 0), {
      message: "Admin signup requires a valid token.",
      path: ["token"],
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
    },
  });

  const watchAccountType = form.watch("accountType");

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);

    let userType: UserProfile['userType'];

    try {
      // Handle super-admin creation
      if (data.email === SUPER_ADMIN_EMAIL) {
        userType = 'super-admin';
      } 
      // Handle regular admin creation
      else if (data.accountType === 'admin') {
        if (!data.token) {
          throw new Error("Admin signup token is missing.");
        }
        const tokenRef = doc(firestore, "signup_tokens", data.token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists() || tokenSnap.data()?.status !== 'active') {
          throw new Error("Invalid or expired signup token.");
        }
        userType = 'admin';
      } else {
        userType = 'vendor';
      }

      // 1. Create the user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Create user profile and update token if necessary
      if (user) {
        const batch = writeBatch(firestore);
        const userDocRef = doc(firestore, "users", user.uid);
        
        const userData: Omit<UserProfile, 'id' | 'address' | 'billingAddress' | 'phone' | 'website'> & { createdAt: any, id: string } = {
            id: user.uid,
            email: user.email,
            userType: userType,
            companyName: data.companyName,
            createdAt: serverTimestamp(),
        };
        batch.set(userDocRef, userData);

        // If an admin was created, mark the token as used
        if (userType === 'admin' && data.token) {
           const tokenRef = doc(firestore, "signup_tokens", data.token);
           batch.update(tokenRef, {
               status: 'used',
               usedBy: user.uid,
               usedAt: serverTimestamp(),
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
            Enter your details to get started.
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
                    <FormLabel>Account Type</FormLabel>
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
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchAccountType === 'vendor' ? 'Company Name' : 'Full Name'}</FormLabel>
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
        <CardFooter className="flex justify-center text-sm">
          Already have an account?
          <Button variant="link" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
