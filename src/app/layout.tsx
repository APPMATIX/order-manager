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
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="25" stroke="url(#logoGrad)" strokeWidth="6" />
      <rect x="22" y="38" width="56" height="38" rx="8" stroke="url(#logoGrad)" strokeWidth="5" />
      <path d="M40 38V33c0-3 2-5 5-5h10c3 0 5 2 5 5v5" stroke="url(#logoGrad)" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 55c13 10 43 10 56 0" stroke="url(#logoGrad)" strokeWidth="5" />
      <circle cx="50" cy="53" r="3" fill="url(#logoGrad)" />
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23f97316'/><stop offset='100%' stop-color='%23db2777'/></linearGradient></defs><rect x='5' y='5' width='90' height='90' rx='25' stroke='url(%23g)' stroke-width='6' fill='none'/><rect x='22' y='38' width='56' height='38' rx='8' stroke='url(%23g)' stroke-width='5' fill='none'/><path d='M40 38V33c0-3 2-5 5-5h10c3 0 5 2 5 5v5' stroke='url(%23g)' stroke-width='5' fill='none' stroke-linecap='round'/><path d='M22 55c13 10 43 10 56 0' stroke='url(%23g)' stroke-width='5' fill='none'/><circle cx='50' cy='53' r='3' fill='url(%23g)'/></svg>" />
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
