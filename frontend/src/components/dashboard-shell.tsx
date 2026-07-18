"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useMe } from "@/features/auth/hooks/use-me";
import { ApiError } from "@/lib/api-client";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const meQuery = useMe();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      router.replace("/admin/login");
    }
  }, [meQuery.error, router]);

  if (meQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </div>
    );
  }

  if (meQuery.error || !meQuery.data) {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-start gap-4 p-6">
        <p className="text-sm text-destructive">
          {meQuery.error instanceof ApiError
            ? meQuery.error.message
            : "Session unavailable."}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace("/admin/login")}
        >
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="flex h-12 flex-row items-center border-b border-sidebar-border px-4">
          <Link href="/admin/dashboard/leads" className="font-medium text-sm">
            Alma
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/admin/dashboard/leads")}
                    render={<Link href="/admin/dashboard/leads">Leads</Link>}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton aria-label="Account menu">
                      <HugeiconsIcon icon={MoreHorizontalIcon} />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent side="top" align="start">
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 items-center gap-4 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
