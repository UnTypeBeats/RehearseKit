"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music2 } from "lucide-react";
import { cn } from "@/utils/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Music2 className="h-6 w-6 text-kit-blue" />
            <span className="font-bold text-xl">RehearseKit</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/" ? "text-foreground" : "text-foreground/60"
              )}
            >
              Home
            </Link>
            <Link
              href="/jobs"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/jobs" ? "text-foreground" : "text-foreground/60"
              )}
            >
              Jobs
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-kit-success animate-pulse-slow" title="All systems operational" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Operational</span>
          </div>
        </div>
      </div>
    </header>
  );
}

