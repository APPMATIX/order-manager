import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'B2B Order Manager',
  description: 'Manage your clients, products, and orders with ease.',
};

const AppLogo = () => (
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A7D7D7" />
          <stop offset="100%" stopColor="#4A8E8E" />
        </linearGradient>
        <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4A6A8E" />
          <stop offset="100%" stopColor="#2E4A6E" />
        </linearGradient>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7AC5C5" />
          <stop offset="100%" stopColor="#A7D7D7" />
        </linearGradient>
      </defs>
      <path d="M50 5 L95 95 L5 95 Z" fill="#2E4A6E" />
      <path d="M50 5 L72.5 50 L27.5 50 Z" fill="url(#grad3)" />
      <path d="M5 95 L50 50 L27.5 95 Z" fill="url(#grad2)" />
      <path d="M95 95 L50 50 L72.5 95 Z" fill="url(#grad1)" />
      <circle cx="50" cy="35" r="12" fill="#C0D6E8" opacity="0.8" />
       <path d="M72.5 95 L83.75 72.5 L61.25 72.5 Z" fill="#A7D7D7" opacity="0.9"/>
       <path d="M83.75 95 L95 95 L83.75 72.5 Z" fill="#7AC5C5" opacity="0.8"/>
       <path d="M72.5 95 L83.75 95 L78.125 83.75 Z" fill="#4A8E8E" opacity="0.9"/>
    </svg>
  );

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50 5 L95 95 L5 95 Z' fill='%232E4A6E' /><path d='M50 5 L72.5 50 L27.5 50 Z' fill='rgb(167,215,215)' /><path d='M5 95 L50 50 L27.5 95 Z' fill='rgb(74,106,142)' /><path d='M95 95 L50 50 L72.5 95 Z' fill='rgb(122,197,197)' /><circle cx='50' cy='35' r='12' fill='rgb(192,214,232)' opacity='0.8' /><path d='M72.5 95 L83.75 72.5 L61.25 72.5 Z' fill='rgba(167,215,215,0.9)'/><path d='M83.75 95 L95 95 L83.75 72.5 Z' fill='rgba(122,197,197,0.8)'/><path d='M72.5 95 L83.75 95 L78.125 83.75 Z' fill='rgba(74,142,142,0.9)'/></svg>" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
