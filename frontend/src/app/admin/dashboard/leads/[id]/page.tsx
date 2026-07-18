"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResumePdfViewer } from "@/features/leads/components/resume-pdf-viewer";
import { useLead } from "@/features/leads/hooks/use-lead";
import { useMarkLeadReachedOut } from "@/features/leads/hooks/use-mark-lead-reached-out";
import type { LeadDetail, LeadStatus } from "@/features/leads/types";
import { ApiError } from "@/lib/api-client";

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

function isPdfResume(lead: LeadDetail) {
  if (lead.resume_content_type.toLowerCase().includes("pdf")) {
    return true;
  }
  return lead.resume_original_filename.toLowerCase().endsWith(".pdf");
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    setShowResume(false);
  }, [leadId]);

  const leadQuery = useLead(leadId);
  const markReachedOut = useMarkLeadReachedOut(leadId);

  const errorMessage =
    leadQuery.error instanceof ApiError
      ? leadQuery.error.message
      : leadQuery.error
        ? "Unable to load lead. Try again."
        : null;

  if (leadQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading lead…</p>
      </div>
    );
  }

  if (errorMessage || !leadQuery.data) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{errorMessage ?? "Lead not found."}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void leadQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const lead = leadQuery.data;
  const canPreviewPdf = isPdfResume(lead);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2 lg:overflow-hidden">
      <div className="flex flex-col gap-6 overflow-auto p-6">
        <h1 className="text-lg font-medium">
          {lead.first_name} {lead.last_name}
        </h1>

        {markReachedOut.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {markReachedOut.error instanceof ApiError
              ? markReachedOut.error.message
              : "Unable to update lead."}
          </div>
        ) : null}

        <dl className="grid max-w-xl gap-4 text-sm">
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  lead.status === "REACHED_OUT" ? "secondary" : "outline"
                }
              >
                {formatStatus(lead.status)}
              </Badge>
              {lead.status === "PENDING" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={markReachedOut.isPending}
                  onClick={() => markReachedOut.mutate()}
                >
                  {markReachedOut.isPending ? "Updating…" : "Mark reached out"}
                </Button>
              ) : null}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Email</dt>
            <dd>
              <a
                className="underline underline-offset-2"
                href={`mailto:${lead.email}`}
              >
                {lead.email}
              </a>
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Received</dt>
            <dd>{formatReceived(lead.created_at)}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Resume</dt>
            <dd>{lead.resume_original_filename}</dd>
          </div>
        </dl>
      </div>

      <div className="min-h-[50vh] bg-background lg:min-h-0">
        {showResume && canPreviewPdf ? (
          <ResumePdfViewer src={lead.resume_url} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            {canPreviewPdf ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResume(true)}
              >
                View resume
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  In-browser preview is available for PDF resumes only.
                </p>
                <a
                  className="text-sm underline underline-offset-2"
                  href={lead.resume_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download resume
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
