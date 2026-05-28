export type ClaimStatus = "pending" | "processing" | "completed" | "failed";
export type RiskLevel = "low" | "medium" | "high";
export type Severity = "critical" | "high" | "medium" | "low";
export type SubmissionReadiness = "Ready" | "Needs Review" | "Not Ready";

export interface ClaimIssue {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: Severity;
  code_reference: string | null;
  denial_likelihood: string | null;
  source: "rule_engine" | "ai";
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
  submission_readiness: SubmissionReadiness | null;
  ai_confidence: string | null;
  processing_time_ms: number | null;
}

export interface ExtractedData {
  payer?: string;
  payer_id?: string;
  patient_age?: string;
  patient_gender?: string;
  icd10_codes?: string[];
  cpt_codes?: string[];
  modifiers?: string[];
  place_of_service?: string;
  provider_type?: string;
  billing_provider_npi?: string;
  rendering_provider_npi?: string;
  service_dates?: string[];
  total_charge?: string;
  claim_type?: string;
  notes?: string;
}

export interface Claim {
  id: string;
  created_at: string;
  status: ClaimStatus;
  file_name: string | null;
  file_type: string | null;
  extracted_data: ExtractedData | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  processing_error: string | null;
  issues: ClaimIssue[];
  fixes: ClaimFix[];
  report: ClaimReport | null;
}

export interface ClaimStatusResponse {
  id: string;
  status: ClaimStatus;
  risk_score: number | null;
  risk_level: RiskLevel | null;
}
