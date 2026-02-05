
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp, collection } from "firebase/firestore";
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
import type { UserProfile, Vendor } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const clientSignupSchema = z
  .object({
    vendorId: z.string().min(1, { message: "Please select your vendor/supplier." }),
    companyName: z.string().min(1, { message: "Your name or company name is required." }),
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

  const vendorsQuery = useMemoFirebase(() => collection(firestore, 'vendors'), [firestore]);
  const { data: vendors, isLoading: areVendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const form = useForm<ClientSignupFormValues>({
    resolver: zodResolver(clientSignupSchema),
    defaultValues: {
      vendorId: "",
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ClientSignupFormValues) => {
    setLoading(true);

    try {
      if (!firestore) throw new Error("Firestore not available");

      // 1. Auth Token Check: Verify Vendor ID
      const selectedVendor = vendors?.find(v => v.id === data.vendorId);
      if (!selectedVendor) throw new Error("The selected vendor is no longer active.");

      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 3. Create client profile document linked to vendor
      if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        
        const userData: Partial<UserProfile> = {
          id: user.uid,
          email: user.email,
          userType: 'client',
          companyName: data.companyName,
          vendorId: data.vendorId, // Crucial link
          createdAt: Timestamp.now(),
        };
        
        await setDoc(userDocRef, userData);
      }

      toast({
        title: "Account Created!",
        description: `Welcome! You are now linked to ${selectedVendor.name}.`,
      });

      router.push("/login/client");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "An unexpected error occurred.",
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
          <CardTitle className="text-2xl">Create Client Account</CardTitle>
          <CardDescription>
            Register to start ordering from your supplier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Your Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={areVendorsLoading ? "Loading suppliers..." : "Select your supplier"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
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
                    <FormLabel>Your Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Trading" {...field} />
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
              <Button type="submit" className="w-full" disabled={loading || areVendorsLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex items-center justify-center text-sm">
             Already have an account?
            <Button variant="link" asChild>
                <Link href="/login/client">Sign in</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
