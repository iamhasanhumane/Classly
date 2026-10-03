"use client";

import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/courses" className="font-semibold tracking-tight shrink-0">
              Classly
            </Link>
            {title ? (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="truncate text-sm text-muted-foreground">
                  {title}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {viewer?.role === "admin" ? (
              <Link
                href="/admin"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Admin
              </Link>
            ) : null}
            <ThemeToggle />
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[160px]">
              {viewer?.name ?? viewer?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4 sm:mr-1" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
