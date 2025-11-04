
"use client";

import { useState } from "react";
import Link from "next/link";
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
import { sendPasswordReset, useAuth } from "@/firebase";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email to send a reset link to." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;


export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
      resolver: zodResolver(forgotPasswordSchema),
      defaultValues: {
          email: "",
      }
  });

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    setIsResetting(true);
    try {
        await sendPasswordReset(auth, data.email);
        toast({
            title: 'Reset Link Sent',
            description: `If an account exists for ${data.email}, a password reset link has been sent.`,
        });
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
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>Enter your email and we'll send a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <Button type="submit" className="w-full" disabled={isResetting}>
                        {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                    </Button>
                </form>
            </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          Remembered your password?
          <Button variant="link" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
