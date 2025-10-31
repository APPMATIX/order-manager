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
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
});

const otpSchema = z.object({
    otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});


type LoginFormValues = z.infer<typeof loginSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;


export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const phoneForm = useForm<PhoneFormValues>({
      resolver: zodResolver(phoneSchema),
      defaultValues: { phoneNumber: "" },
  });

  const otpForm = useForm<OtpFormValues>({
      resolver: zodResolver(otpSchema),
      defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      setLoading(false);
      setDemoLoading(false);
      setPhoneLoading(false);
      router.replace("/dashboard");
    }
  }, [user, isUserLoading, router]);
  
   useEffect(() => {
    if (!auth) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
    return () => {
        window.recaptchaVerifier.clear();
    }
  }, [auth]);

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

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    initiateEmailSignIn(auth, "demo@example.com", "password");
    setTimeout(() => {
        if (!user) { // if after 5s still no user
            setDemoLoading(false);
        }
    }, 5000);
  };
  
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setPhoneLoading(true);
    try {
        const verifier = window.recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, data.phoneNumber, verifier);
        setConfirmationResult(result);
        setShowOtpInput(true);
        toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (error: any) {
        console.error("Phone sign-in error", error);
        toast({
            variant: "destructive",
            title: "Error Sending OTP",
            description: error.message || "Could not send verification code. Please try again.",
        });
    } finally {
        setPhoneLoading(false);
    }
  };

  const onOtpSubmit = async (data: OtpFormValues) => {
    if (!confirmationResult) return;
    setPhoneLoading(true);
    try {
        await confirmationResult.confirm(data.otp);
        // User is now signed in. The useEffect will redirect.
    } catch (error: any) {
         console.error("OTP verification error", error);
        toast({
            variant: "destructive",
            title: "Invalid OTP",
            description: "The code you entered is incorrect. Please try again.",
        });
        setPhoneLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
             <Box className="h-10 w-10 text-primary"/>
          </div>
          <CardTitle className="text-2xl">B2B Order Manager</CardTitle>
          <CardDescription>Welcome back! Please sign in.</CardDescription>
        </CardHeader>
        <CardContent>
        <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
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
                 <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                    </span>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDemoLogin}
                    disabled={demoLoading}
                >
                    {demoLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log in as Demo User
                </Button>
            </TabsContent>
            <TabsContent value="phone">
               {!showOtpInput ? (
                 <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={phoneForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 123 456 7890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={phoneLoading}>
                            {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send OTP
                        </Button>
                    </form>
                 </Form>
               ) : (
                <Form {...otpForm}>
                     <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={otpForm.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Verification Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123456" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={phoneLoading}>
                            {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify OTP
                        </Button>
                        <Button variant="link" size="sm" onClick={() => setShowOtpInput(false)} className="w-full">
                            Back to phone number entry
                        </Button>
                    </form>
                </Form>
               )}
            </TabsContent>
        </Tabs>
        <div id="recaptcha-container"></div>
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
