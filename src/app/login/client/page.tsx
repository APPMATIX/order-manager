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
import { Loader2, Box, Info } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth, useUser, useFirestore } from "@/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function ClientLoginPage() {
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
      // Session handling
    }
  }, [user, isUserLoading, router]);

  const onEmailSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const loggedInUser = userCredential.user;

      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("Client profile not found.");
      }

      const profile = userDoc.data();

      // Strict Account Status Check
      if (profile.status === 'paused') {
        const remark = profile.statusRemark || 'Contact your supplier for details.';
        await signOut(auth);
        throw new Error(`Your account is suspended. Reason: ${remark}`);
      }

      if (profile.userType !== 'client') {
        await signOut(auth);
        throw new Error("This account is not a Client account. Please use the Vendor/Admin login.");
      }

      router.replace("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message || "Invalid credentials.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4">
        <Card className="w-full border-0 shadow-lg sm:border transition-all">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Box className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Client Portal Login</CardTitle>
            <CardDescription>Welcome back! Sign in to place an order.</CardDescription>
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
                      <Link href="/signup/client">Sign Up Here</Link>
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

        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-muted/30 py-2 rounded-lg border border-dashed border-muted-foreground/20">
          <Info className="h-3 w-3" />
          IF FORGOT PASSWORD CONTACT ADMIN
        </div>
      </div>
    </div>
  );
}
