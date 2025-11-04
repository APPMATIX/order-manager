
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { initiateEmailSignIn, sendPasswordReset } from "@/firebase/non-blocking-login";
import { useAuth, useUser } from "@/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email to send a reset link to." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;


export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
      resolver: zodResolver(forgotPasswordSchema),
      defaultValues: {
          email: "",
      }
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
    setTimeout(() => {
      if (!user) {
        setLoading(false);
      }
    }, 5000);
  };
  
  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    setIsResetting(true);
    try {
        await sendPasswordReset(auth, data.email);
        toast({
            title: 'Reset Link Sent',
            description: `If an account exists for ${data.email}, a password reset link has been sent.`,
        });
        setIsResetDialogOpen(false);
        forgotPasswordForm.reset();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || "Failed to send password reset email."
        })
    } finally {
        setIsResetting(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center animated-gradient p-4">
      <Card className="w-full max-w-sm border-0 shadow-lg sm:border transition-all">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Box className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">B2B Order Manager</CardTitle>
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
                         <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button variant="link" type="button" className="p-0 h-auto text-xs">
                                     Forgot Password?
                                </Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Reset Your Password</DialogTitle>
                                    <DialogDescription>
                                        Enter your email address below and we'll send you a link to reset your password.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...forgotPasswordForm}>
                                    <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                                        <FormField
                                            control={forgotPasswordForm.control}
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
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <Button type="submit" disabled={isResetting}>
                                                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send Reset Link
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                         </Dialog>
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
