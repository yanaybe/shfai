export type UserRole = "admin" | "owner" | "member";
export type ClaimStatus = "uploaded" | "processing" | "analyzed" | "needs_review" | "approved";
export type RiskLevel = "low" | "medium" | "high";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  organization_name: string | null;
}

export interface ClaimIssue {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  code_reference: string | null;
  denial_likelihood: string | null;
  source: string;
}

export interface ClaimFix {
  id: string;
  issue_id: string | null;
  action: string;
  rationale: string;
  priority: number;
}

export interface ClaimReport {
  executive_summary: string | null;
  payer_adjudication_simulation: string | null;
  submission_readiness: string | null;
  ai_confidence: string | null;
  processing_time_ms: number | null;
}

export interface ClaimListItem {
  id: string;
  created_at: string;
  updated_at: string;
  status: ClaimStatus;
  file_name: string | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  payer: string | null;
  uploaded_by: { id: string; full_name: string; email: string } | null;
}

export interface Claim extends ClaimListItem {
  file_type: string | null;
  extracted_data: Record<string, unknown> | null;
  processing_error: string | null;
  issues: ClaimIssue[];
  fixes: ClaimFix[];
  report: ClaimReport | null;
}

export interface ClaimListResponse {
  items: ClaimListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface PlatformStats {
  total_organizations: number;
  total_users: number;
  total_claims: number;
  claims_this_week: number;
  high_risk_claims: number;
  avg_risk_score: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  organization_id: string | null;
  organization_name: string | null;
  claim_count: number;
}

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  claim_count: number;
}

export interface AdminClaim {
  id: string;
  created_at: string;
  status: ClaimStatus;
  file_name: string | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  payer: string | null;
  organization_name: string | null;
  organization_id: string;
  uploaded_by: { id: string; full_name: string; email: string } | null;
}
