
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
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { useAuth, useUser } from "@/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;


export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      setLoading(false);
      router.replace("/dashboard");
    }
  }, [user, isUserLoading, router]);
  

  const onEmailSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    initiateEmailSignIn(auth, data.email, data.password);
    // The onAuthStateChanged listener in the provider will handle redirection.
    // We can show a toast or simply wait. A timeout can handle cases where login fails.
    setTimeout(() => {
        if (!user) { // if after 5s still no user
            setLoading(false);
        }
    }, 5000); // 5 second timeout
  };

  return (
    <div className="flex min-h-screen items-center justify-center animated-gradient p-4">
      <Card className="w-full max-w-sm border-0 shadow-lg sm:border">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
             <Box className="h-10 w-10 text-primary"/>
          </div>
          <CardTitle className="text-2xl">B2B Order Manager</CardTitle>
          <CardDescription>Welcome back! Please sign in.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-4 pt-4">
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
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
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
         <CardFooter className="flex justify-center text-sm">
            Don't have an account?
            <Button variant="link" asChild>
                <Link href="/signup">Sign up</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
