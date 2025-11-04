
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  LogOut,
  Package,
  ShoppingCart,
  Users,
  LayoutDashboard,
  Settings,
  Receipt,
  FileText,
  Shield,
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
  
  const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['vendor'] },
        { href: '/products', icon: Package, label: 'Products', roles: ['vendor'] },
        { href: '/orders', icon: ShoppingCart, label: 'Orders', roles: ['vendor'] },
        { href: '/clients', icon: Users, label: 'Clients', roles: ['vendor'] },
        { href: '/purchase', icon: Receipt, label: 'Purchase', roles: ['vendor'] },
        { href: '/reports', icon: FileText, label: 'Reports', roles: ['vendor'] },
        { href: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin', 'super-admin'] },
      ];

  const userRole = userProfile?.userType || 'vendor';
  let userNavItems = navItems.filter(item => item.roles.includes(userRole));
  
  // Super-admin only sees Admin Panel and Settings
  if (userRole === 'super-admin') {
      userNavItems = navItems.filter(item => item.href === '/admin');
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
          <Link
            href={'/dashboard'}
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Box className="h-5 w-5 transition-all group-hover:scale-110 text-[hsl(var(--chart-sales))]" />
            <span className="sr-only">B2B Order Manager</span>
          </Link>
          {userNavItems.map((item) => (
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
              <Link
                href="/profile"
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                  pathname.startsWith('/profile') && 'bg-accent text-accent-foreground'
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Profile Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Profile Settings</TooltipContent>
          </Tooltip>
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
