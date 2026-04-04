export type UserRole = "admin" | "employee";

export interface UserBrief {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  /** After admin reset, user must change password before other API routes. */
  must_change_password: boolean;
}

/** GET /auth/me */
export interface MeResponse {
  user: UserBrief;
  /** Mirrors server `EMPLOYEE_CAN_EDIT_OTHERS_RECORDS` for UX alignment with KYC RBAC. */
  kyc_employee_can_edit_others: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

export interface KYCRecordDto {
  id: string;
  employee_name: string;
  client_full_name: string;
  age: number;
  passport_job_title: string;
  other_job_title: string | null;
  service_type: string;
  relatives_kinship: string | null;
  assigned_to: string | null;
  assigned_by_rule: boolean;
  has_bank_statement: string;
  available_balance: string | null;
  expected_balance: string | null;
  marital_status: string;
  children_count: number | null;
  has_relatives_abroad: string;
  nationality_type: string;
  nationality: string | null;
  residency_status: string | null;
  governorate: string;
  consultation_method: string;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  previous_rejected: string;
  rejection_numbers: string | null;
  rejection_reason: string | null;
  rejection_country: string | null;
  has_previous_visas: string;
  previous_visa_countries: string | null;
  recommendation: string | null;
  status: string;
  created_by_id: string;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
  soft_deleted_at: string | null;
}

export interface KPISummary {
  total_submissions: number;
  submissions_today: number;
  submissions_this_week: number;
  submissions_this_month: number;
  active_employees: number;
  average_age: number | null;
  /** Status مرفوض / total in filtered range (%) */
  rejection_rate: number | null;
  /** previous_rejected نعم / total in filtered range (%) */
  prior_refusal_rate: number | null;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface TrendPoint {
  period: string;
  count: number;
}

export interface FunnelStage {
  status: string;
  count: number;
}

export interface AnalyticsSummary {
  kpi: KPISummary;
  by_service_type: NamedCount[];
  by_status: NamedCount[];
  previous_visa_ratio: Record<string, number>;
  nationality_split: NamedCount[];
  marital_split: NamedCount[];
  top_employees: NamedCount[];
  trend_daily: TrendPoint[];
  trend_weekly: TrendPoint[];
  trend_monthly: TrendPoint[];
  funnel_by_status: FunnelStage[];
}

export interface AuditLogDto {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** POST /users/:id/reset-password */
export interface AdminPasswordResetResponse {
  message: string;
  temporary_password: string | null;
}

export interface UserActivitySummaryDto {
  user_id: string;
  username: string;
  full_name: string;
  last_login_at: string | null;
  audit_events_last_30_days: number;
  kyc_created_count: number;
}
