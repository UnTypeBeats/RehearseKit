'use client';

/**
 * Login Dialog Component
 * Supports Google OAuth and optional email/password login
 */
import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { AuthTokens } from '@/utils/auth';
import { getApiUrl } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const apiUrl = getApiUrl();

  /**
   * Handle Google OAuth success
   */
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({
        title: 'Login failed',
        description: 'No credential received from Google',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: credentialResponse.credential,
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const tokens: AuthTokens = await response.json();
      await login(tokens);

      toast({
        title: 'Welcome!',
        description: 'Successfully logged in with Google',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: 'Login failed',
        description: 'Could not authenticate with Google. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle email/password login
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const tokens: AuthTokens = await response.json();
      await login(tokens);

      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in',
      });

      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Email login error:', error);
      toast({
        title: 'Login failed',
        description: 'Incorrect email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to save your jobs and access them from anywhere
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Google OAuth */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                toast({
                  title: 'Login failed',
                  description: 'Could not connect to Google',
                  variant: 'destructive',
                });
              }}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {showEmailLogin ? 'Or continue with Google' : 'Or use email'}
              </span>
            </div>
          </div>

          {/* Email/Password Login (Optional) */}
          {showEmailLogin ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowEmailLogin(false)}
                disabled={isLoading}
              >
                Back to Google Sign In
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowEmailLogin(true)}
              disabled={isLoading}
            >
              Sign in with Email
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            You can also use the app without signing in. Your jobs will be public and may be deleted after 7 days.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

