"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, listLeads } from "@/lib/api";
import type { Lead } from "@/lib/types";

const DEFAULT_LIMIT = 20;
const LIMIT_ALLOWLIST = new Set([10, 20, 50]);

function parseLimit(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || !LIMIT_ALLOWLIST.has(value)) {
    return DEFAULT_LIMIT;
  }
  return value;
}

function formatReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const limit = parseLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  function replaceParams(next: { cursor?: string | null; limit?: number }) {
    const params = new URLSearchParams();
    const nextLimit = next.limit ?? limit;
    if (nextLimit !== DEFAULT_LIMIT) {
      params.set("limit", String(nextLimit));
    }
    const nextCursorValue =
      next.cursor === undefined ? cursor : next.cursor;
    if (nextCursorValue) {
      params.set("cursor", nextCursorValue);
    }
    const qs = params.toString();
    router.replace(
      qs ? `/admin/dashboard/leads?${qs}` : "/admin/dashboard/leads",
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLeads() {
      setLoading(true);
      setError(null);
      try {
        const response = await listLeads({ limit, cursor });
        if (cancelled) {
          return;
        }
        setLeads(response.items);
        setNextCursor(response.next_cursor);
        setHasMore(response.has_more);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/admin/login");
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load leads. Try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeads();
    return () => {
      cancelled = true;
    };
  }, [limit, cursor, router, reloadToken]);

  function goNext() {
    if (!hasMore || !nextCursor) {
      return;
    }
    setCursorHistory((history) => [...history, cursor]);
    replaceParams({ cursor: nextCursor });
  }

  function goPrevious() {
    if (cursorHistory.length === 0) {
      return;
    }
    const previous = cursorHistory[cursorHistory.length - 1] ?? null;
    setCursorHistory((history) => history.slice(0, -1));
    replaceParams({ cursor: previous });
  }

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "created_at",
      header: "Received",
      cell: ({ row }) => formatReceived(row.original.created_at),
    },
    {
      id: "name",
      header: "Name",
      cell: ({ row }) =>
        `${row.original.first_name} ${row.original.last_name}`,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "REACHED_OUT" ? "secondary" : "outline"
          }
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-medium">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Newest submissions first.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          Loading leads…
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={leads} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {cursorHistory.length + 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={cursorHistory.length === 0 || loading}
                onClick={goPrevious}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!hasMore || loading}
                onClick={goNext}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
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
