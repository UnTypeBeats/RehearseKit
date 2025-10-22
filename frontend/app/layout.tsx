import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RehearseKit - Your Complete Rehearsal Toolkit",
  description: "Transform any audio source into a ready-to-use rehearsal project in minutes. Automatically separate stems, detect tempo, and generate Cubase project files.",
  keywords: ["stem separation", "audio processing", "rehearsal", "DAW", "Cubase", "music production", "BPM detection"],
  authors: [{ name: "RehearseKit" }],
  creator: "RehearseKit",
  publisher: "RehearseKit",
  openGraph: {
    title: "RehearseKit - Your Complete Rehearsal Toolkit",
    description: "Transform audio into rehearsal-ready stems and DAW projects",
    url: "https://rehearsekit.uk",
    siteName: "RehearseKit",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RehearseKit - Your Complete Rehearsal Toolkit",
    description: "Transform audio into rehearsal-ready stems and DAW projects",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.NEXT_PUBLIC_GOOGLE_CLIENT_ID = '${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}';
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

