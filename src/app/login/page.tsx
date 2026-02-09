"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth, useUser, useFirestore } from "@/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      // If already logged in, the DashboardPage will handle the role redirection.
    }
  }, [user, isUserLoading, router]);

  const onEmailSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const loggedInUser = userCredential.user;

      // 2. Auth Token Check: Verify User Profile and Role in Firestore
      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("User profile not found. Please contact support or sign up again.");
      }

      const profile = userDoc.data();
      
      // 3. Prevent Clients from logging into the Vendor/Admin portal
      if (profile.userType === 'client') {
        await signOut(auth);
        throw new Error("This portal is for Vendors and Admins only. Please use the Client Login.");
      }

      toast({
        title: "Welcome back!",
        description: `Logged in as ${profile.companyName || profile.email}`,
      });

      router.replace("/dashboard");
    } catch (error: any) {
      let message = "Invalid credentials. Please check your email and password.";
      if (error.message) message = error.message;
      
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: message,
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-0 shadow-lg sm:border transition-all">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Box className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Vendor & Admin Login</CardTitle>
          <CardDescription>Welcome back! Please sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onEmailSubmit)} className="space-y-4 pt-4">
              <FormField
                control={loginForm.control}
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
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                         <FormLabel>Password</FormLabel>
                         <Button variant="link" asChild className="p-0 h-auto text-xs">
                           <Link href="/login/forgot-password">Forgot Password?</Link>
                         </Button>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-center justify-center text-sm gap-2">
            <div>
                 Don't have an account?
                <Button variant="link" asChild>
                    <Link href="/signup">Sign Up</Link>
                </Button>
            </div>
             <div>
                Are you a client?
                <Button variant="link" asChild>
                    <Link href="/login/client">Client Login</Link>
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
