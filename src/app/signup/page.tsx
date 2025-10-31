
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore";
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
  FormDescription,
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

const signupSchema = z
  .object({
    companyName: z.string().min(1, { message: "Company name is required." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
    token: z.string().min(1, { message: 'A valid signup token is required.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
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
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
      token: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);

    if (data.email === 'admin@example.com') {
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const user = userCredential.user;
          const userDocRef = doc(firestore, "users", user.uid);
          await setDoc(userDocRef, {
              id: user.uid,
              email: user.email,
              userType: 'admin',
              companyName: 'Admin',
              createdAt: serverTimestamp(),
          });
          toast({ title: "Admin Account Created", description: "You have successfully created the admin account." });
          router.push("/admin");
      } catch (error: any) {
          toast({ variant: "destructive", title: "Admin Creation Failed", description: error.message });
      } finally {
          setLoading(false);
      }
      return;
    }


    try {
      // 1. Validate the token
      const tokenRef = doc(firestore, "signup_tokens", data.token);
      const tokenSnap = await getDoc(tokenRef);

      if (!tokenSnap.exists() || tokenSnap.data().isUsed) {
        throw new Error("This signup token is invalid or has already been used.");
      }

      // 2. Create the user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 3. Use a batch to create user profile and update token
      if (user) {
        const batch = writeBatch(firestore);

        const userDocRef = doc(firestore, "users", user.uid);
        const userData: Omit<UserProfile, 'id' | 'userType' | 'address' | 'billingAddress' | 'phone' | 'website'> & { userType: 'vendor', createdAt: any } = {
            email: user.email,
            userType: 'vendor',
            companyName: data.companyName,
            createdAt: serverTimestamp(),
        };
        batch.set(userDocRef, userData);

        batch.update(tokenRef, {
            isUsed: true,
            usedAt: serverTimestamp(),
            usedBy: user.email
        });
        
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
        description = error.message; // Use the custom error for invalid token
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
          <CardTitle className="text-2xl">Create a Vendor Account</CardTitle>
          <CardDescription>
            Enter your details and signup token to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
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
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signup Token</FormLabel>
                      <FormControl>
                        <Input placeholder="Paste your signup token here" {...field} />
                      </FormControl>
                       <FormDescription>
                        This token should be provided by an administrator.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

    