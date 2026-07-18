"use client";

import type { PaginationState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import {
  parseAsInteger,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { Suspense } from "react";

import { leadColumns } from "@/app/admin/dashboard/leads/columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeads } from "@/features/leads/hooks/use-leads";
import type { Lead, LeadStatus } from "@/features/leads/types";
import { ApiError } from "@/lib/api-client";

const STATUS_ALL = "all";
const PAGE_SIZE = 50;

const leadsSearchParams = {
  page: parseAsInteger.withDefault(1),
  status: parseAsStringEnum<LeadStatus>(["PENDING", "REACHED_OUT"]),
};

function LeadsPageContent() {
  const router = useRouter();
  const [params, setParams] = useQueryStates(leadsSearchParams, {
    history: "push",
  });

  const page = Math.max(1, params.page);
  const status = params.status;

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: PAGE_SIZE,
  };

  const leadsQuery = useLeads({
    page,
    page_size: PAGE_SIZE,
    status,
  });

  const pageCount = leadsQuery.data
    ? Math.ceil(leadsQuery.data.total / PAGE_SIZE)
    : 0;

  function handlePaginationChange(
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    void setParams({
      page: next.pageIndex + 1,
    });
  }

  function handleStatusChange(value: string | null) {
    const nextStatus =
      value === "PENDING" || value === "REACHED_OUT" ? value : null;
    void setParams({
      status: nextStatus,
      page: 1,
    });
  }

  const errorMessage =
    leadsQuery.error instanceof ApiError
      ? leadsQuery.error.message
      : leadsQuery.error
        ? "Unable to load leads. Try again."
        : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-medium">Leads</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select
            value={status ?? STATUS_ALL}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REACHED_OUT">Reached out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{errorMessage}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void leadsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={leadColumns}
        data={leadsQuery.data?.items ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        isLoading={leadsQuery.isLoading}
        onRowClick={(lead: Lead) =>
          router.push(`/admin/dashboard/leads/${lead.id}`)
        }
      />
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <LeadsPageContent />
    </Suspense>
  );
}
