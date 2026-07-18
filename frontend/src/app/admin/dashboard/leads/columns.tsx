"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { Lead, LeadStatus } from "@/features/leads/types";

function formatReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatStatus(status: LeadStatus) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "REACHED_OUT":
      return "Reached out";
  }
}

export const leadColumns: ColumnDef<Lead>[] = [
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
        {formatStatus(row.original.status)}
      </Badge>
    ),
  },
];
