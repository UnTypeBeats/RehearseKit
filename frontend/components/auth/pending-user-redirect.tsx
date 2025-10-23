'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Component to redirect pending users to the approval page
 * Add this to the root layout to protect all pages
 */
export function PendingUserRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if still loading
    if (isLoading) return;

    // Don't redirect if no user (not authenticated)
    if (!user) return;

    // Don't redirect if already on pending approval page
    if (pathname === '/pending-approval') return;

    // Don't redirect if user is active
    if (user.is_active) return;

    // User is authenticated but not active - redirect to pending page
    console.log('Redirecting pending user to approval page');
    router.push('/pending-approval');
  }, [user, isLoading, pathname, router]);

  // This component doesn't render anything
  return null;
}
