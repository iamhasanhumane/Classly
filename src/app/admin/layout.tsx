"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/students", label: "Students" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const viewer = useQuery(api.users.viewer);

  if (viewer && viewer.role !== "admin") {
    return (
      <AppShell title="Admin">
        <div className="p-8">You need admin access to view this area.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-6 p-4 md:p-8">
        <nav className="flex md:flex-col gap-2 md:w-48 shrink-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-accent",
                pathname === l.href && "bg-accent font-medium",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </AppShell>
  );
}
