'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  LogOut,
  Package,
  PanelLeft,
  ShoppingCart,
  Users,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/context/UserProfileContext';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();

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
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/products', icon: Package, label: 'Products' },
    { href: '/orders', icon: ShoppingCart, label: 'Orders' },
    { href: '/clients', icon: Users, label: 'Clients' },
  ];

  const breadcrumbItems = pathname.split('/').filter(Boolean);

  const getInitial = (email: string | null | undefined) => {
    return email ? email.charAt(0).toUpperCase() : 'U';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
           <SheetHeader>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Main navigation links for the application.
              </SheetDescription>
            </SheetHeader>
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="#"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Box className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">B2B Order Manager</span>
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                  pathname.startsWith(item.href) && 'text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
             <Link
                href="/profile"
                className={cn(
                  'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                  pathname.startsWith('/profile') && 'text-foreground'
                )}
              >
                <Settings className="h-5 w-5" />
                Profile Settings
              </Link>
          </nav>
        </SheetContent>
      </Sheet>
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === breadcrumbItems.length - 1 ? (
                  <BreadcrumbPage className="capitalize">{item}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={`/${breadcrumbItems.slice(0, index + 1).join('/')}`}
                      className="capitalize"
                    >
                      {item}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="relative ml-auto flex items-center gap-4">
        {userProfile?.companyName && (
          <div className="hidden text-right md:block">
            <div className="font-semibold">{userProfile.companyName}</div>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
               <Avatar>
                  <AvatarImage src={user?.photoURL || ''} alt="User avatar" />
                  <AvatarFallback>{getInitial(user?.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>{user?.email}</DropdownMenuItem>
             {userProfile?.companyName && <DropdownMenuItem disabled>{userProfile.companyName}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
