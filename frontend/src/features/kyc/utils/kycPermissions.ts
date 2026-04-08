import type { KYCRecordDto, UserBrief } from "@/types/api";

/** Aligns with backend `can_employee_modify_kyc_record` / employee policy. */
export function canEmployeeEditKyc(
  user: UserBrief | null,
  record: Pick<KYCRecordDto, "created_by_id">,
  kycEmployeeCanEditOthers: boolean,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (kycEmployeeCanEditOthers) return true;
  return record.created_by_id === user.id;
}

/** Soft delete is `DELETE /kyc/:id` — backend allows admin only. */
export function canAdminSoftDeleteKyc(
  user: UserBrief | null,
  record: Pick<KYCRecordDto, "soft_deleted_at">,
): boolean {
  return user?.role === "admin" && record.soft_deleted_at == null;
}

/** Soft-deleted rows are not updatable (backend returns 404 on PATCH). */
export function canEditKycRecord(
  user: UserBrief | null,
  record: Pick<KYCRecordDto, "created_by_id" | "soft_deleted_at">,
  kycEmployeeCanEditOthers: boolean,
): boolean {
  if (record.soft_deleted_at != null) return false;
  return canEmployeeEditKyc(user, record, kycEmployeeCanEditOthers);
}
