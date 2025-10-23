'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, CheckCircle } from 'lucide-react';

/**
 * Pending Approval Page
 * Shown to users whose accounts are awaiting admin approval
 */
export default function PendingApprovalPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect active users to home
    if (!isLoading && user && user.is_active) {
      router.push('/');
    }
    // Redirect unauthenticated users to home
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-3xl font-bold">Account Pending Approval</CardTitle>
          <CardDescription className="text-lg">
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Account Email:</span>
            </div>
            <p className="font-medium ml-6">{user.email}</p>
          </div>

          {/* Status Message */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Account Created Successfully</h3>
                <p className="text-sm text-muted-foreground">
                  Your account has been created and is now in our review queue.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Waiting for Approval</h3>
                <p className="text-sm text-muted-foreground">
                  An administrator will review your account shortly. You&apos;ll be able to access all features once approved.
                </p>
              </div>
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Our administrators will review your account within 24-48 hours</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You&apos;ll receive an email notification once your account is approved</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>After approval, you&apos;ll have full access to RehearseKit features</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              Refresh Status
            </Button>
            <Button
              onClick={logout}
              variant="secondary"
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground pt-4">
            Need immediate access? Contact your administrator or reach out to support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
