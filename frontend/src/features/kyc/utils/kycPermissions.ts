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
