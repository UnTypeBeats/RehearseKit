"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "@/contexts/auth-context";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [googleClientId, setGoogleClientId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Google Client ID from API at runtime
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log('Fetching config from /api/auth/config...');
        const response = await fetch('/api/auth/config');
        console.log('Response status:', response.status);
        if (response.ok) {
          const config = await response.json();
          console.log('Config response:', config);
          setGoogleClientId(config.googleClientId);
          console.log('Fetched Google Client ID:', config.googleClientId);
        } else {
          console.error('Failed to fetch config:', response.status);
          setGoogleClientId('');
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        setGoogleClientId('');
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Show loading state while fetching config
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kit-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

