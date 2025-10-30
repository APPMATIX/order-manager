'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  LogOut,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

import { useAuth } from '@/firebase';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/context/UserProfileContext';

export function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: 'There was a problem signing you out.',
      });
    }
  };

  const vendorNavItems = [
    { href: '/products', icon: Package, label: 'Products' },
    { href: '/clients', icon: Users, label: 'Clients' },
  ];

  const clientNavItems = [
    { href: '/products', icon: Package, label: 'Browse Products' },
  ];

  // During initial load, userProfile might be null, so we default to client to avoid showing vendor links incorrectly
  const navItems = userProfile?.userType === 'vendor' ? vendorNavItems : clientNavItems;


  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
          <Link
            href="/products"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Box className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">B2B Order Manager</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    pathname.startsWith(item.href) && 'bg-accent text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign Out</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
