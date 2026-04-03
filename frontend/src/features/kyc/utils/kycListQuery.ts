/** Shared KYC list query params for table + Excel export (must match backend list_kyc_ep). */

export const KYC_LIST_SORT_FIELDS = [
  "created_at",
  "status",
  "service_type",
  "client_full_name",
  "employee_name",
  "assigned_to",
  "age",
] as const;

export type KycListSortField = (typeof KYC_LIST_SORT_FIELDS)[number];

export function isKycListSortField(s: string): s is KycListSortField {
  return (KYC_LIST_SORT_FIELDS as readonly string[]).includes(s);
}

export interface KycListFilterState {
  search: string;
  clientName: string;
  phone: string;
  serviceType: string;
  status: string;
  createdById: string;
  dateFrom: string;
  dateTo: string;
  includeDeleted: boolean;
  sortBy: KycListSortField;
  sortOrder: "asc" | "desc";
  isAdmin: boolean;
}

export function buildKycListQueryParams(
  filters: KycListFilterState,
  page: number,
  pageSize: number,
): URLSearchParams {
  const q = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: filters.sortBy,
    sort_order: filters.sortOrder,
  });
  if (filters.search.trim()) q.set("search", filters.search.trim());
  if (filters.clientName.trim()) q.set("client_name", filters.clientName.trim());
  if (filters.phone.trim()) q.set("phone", filters.phone.trim());
  if (filters.serviceType) q.set("service_type", filters.serviceType);
  if (filters.status) q.set("status", filters.status);
  if (filters.isAdmin && filters.createdById) q.set("created_by_id", filters.createdById);
  if (filters.dateFrom) q.set("date_from", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) q.set("date_to", `${filters.dateTo}T23:59:59.999Z`);
  if (filters.isAdmin && filters.includeDeleted) q.set("include_deleted", "true");
  return q;
}
