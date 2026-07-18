export type User = {
  id: string;
  username: string;
  display_name: string;
  account_type: "ATTORNEY";
};

export type LeadStatus = "PENDING" | "REACHED_OUT";

export type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: LeadStatus;
  resume_original_filename: string;
  resume_content_type: string;
  resume_size_bytes: number;
  created_at: string;
  updated_at: string;
};

export type LeadListResponse = {
  items: Lead[];
  next_cursor: string | null;
  has_more: boolean;
};
