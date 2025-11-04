
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp, collection, getDocs, query, where } from "firebase/firestore";
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
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const clientSignupSchema = z
  .object({
    name: z.string().min(1, { message: "Your name or company name is required." }),
    vendorId: z.string().min(1, { message: "Please select a vendor." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ClientSignupFormValues = z.infer<typeof clientSignupSchema>;

export default function ClientSignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('userType', '==', 'vendor'));
  }, [firestore]);

  const { data: vendors, isLoading: vendorsLoading } = useCollection<UserProfile>(vendorsQuery);

  const form = useForm<ClientSignupFormValues>({
    resolver: zodResolver(clientSignupSchema),
    defaultValues: {
      name: "",
      vendorId: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ClientSignupFormValues) => {
    setLoading(true);

    try {
      if (!firestore) throw new Error("Firestore not available");
      
      const userType: UserProfile['userType'] = 'client';

      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Create user profile document
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        
        const userData: Omit<UserProfile, 'id' | 'address' | 'billingAddress' | 'phone' | 'website' | 'photoURL'> & { createdAt: any, id: string } = {
          id: user.uid,
          email: user.email,
          userType: userType,
          companyName: data.name,
          vendorId: data.vendorId,
          createdAt: Timestamp.now(),
        };
        
        await setDoc(userDocRef, userData);
      }

      toast({
        title: "Account Created!",
        description: `Welcome, ${data.name}! You can now log in.`,
      });

      router.push("/login/client");

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
          <CardTitle className="text-2xl">Create a Client Account</CardTitle>
          <CardDescription>
            Register to start placing orders with your vendor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name / Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder='John Doe' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              <Button type="submit" className="w-full" disabled={loading || vendorsLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-center justify-center text-sm gap-2">
            <div>
                 Already have a client account?
                <Button variant="link" asChild>
                    <Link href="/login/client">Sign in</Link>
                </Button>
            </div>
             <div>
                 Not a client?
                <Button variant="link" asChild>
                    <Link href="/login">Vendor/Admin Login</Link>
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
