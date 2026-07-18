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
  total: number;
  page: number;
  page_size: number;
};

export type LeadDetail = Lead & {
  resume_url: string;
};

export type ResumeLink = {
  url: string;
  filename: string;
  content_type: string;
  expires_in: number;
};

export type LeadCreateResponse = {
  id: string;
  status: LeadStatus;
};

export type CreateLeadInput = {
  first_name: string;
  last_name: string;
  email: string;
  resume: File;
};

export type ListLeadsParams = {
  page?: number;
  page_size?: number;
  status?: LeadStatus | null;
};
