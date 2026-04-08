import { KYC_ASSIGNEES, SERVICE_BRANCHES } from "@/features/kyc/utils/kycFieldOptions";
import type { KYCRecordDto } from "@/types/api";
import { assignedPreview, type KycFormValues } from "./kycZod";

function normalizeServiceBranchForForm(raw: string): KycFormValues["service_type"] {
  if ((SERVICE_BRANCHES as readonly string[]).includes(raw)) {
    return raw as KycFormValues["service_type"];
  }
  if (raw === "بافلي") return "بافلي القاهرة";
  if (raw === "ترانس روفر") return "ترانس روفر القاهرة";
  if (raw === "أخرى") return "بافلي القاهرة";
  return SERVICE_BRANCHES[0];
}

function num(s: string | null | undefined) {
  if (!s?.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function toCreatePayload(values: KycFormValues) {
  return {
    employee_name: values.employee_name,
    client_full_name: values.client_full_name,
    age: values.age,
    passport_job_title: values.passport_job_title,
    other_job_title: values.other_job_title || null,
    service_type: values.service_type,
    assigned_to: values.assigned_to.trim(),
    has_bank_statement: values.has_bank_statement,
    available_balance:
      values.has_bank_statement === "نعم" ? num(values.available_balance) : null,
    expected_balance:
      values.has_bank_statement === "لا" ? num(values.expected_balance) : null,
    has_property_assets: values.has_property_assets,
    property_assets_detail:
      values.has_property_assets === "نعم"
        ? values.property_assets_detail?.trim() || null
        : null,
    has_usd_account: values.has_usd_account,
    has_bank_account: values.has_bank_account,
    has_commercial_register_and_tax_card: values.has_commercial_register_and_tax_card,
    marital_status: values.marital_status,
    children_count:
      values.marital_status === "متزوج" ? values.children_count ?? null : null,
    has_relatives_abroad: values.has_relatives_abroad,
    relatives_kinship:
      values.has_relatives_abroad === "نعم" ? values.relatives_kinship?.trim() || null : null,
    nationality_type: values.nationality_type,
    nationality: values.nationality_type === "غير مصري" ? values.nationality : null,
    residency_status:
      values.nationality_type === "غير مصري" ? values.residency_status : null,
    governorate: values.governorate,
    consultation_method: values.consultation_method,
    email: values.email,
    phone_number: values.phone_number,
    whatsapp_number: values.whatsapp_number,
    previous_rejected: values.previous_rejected,
    rejection_numbers:
      values.previous_rejected === "نعم" ? values.rejection_numbers : null,
    rejection_reason:
      values.previous_rejected === "نعم" ? values.rejection_reason : null,
    rejection_country:
      values.previous_rejected === "نعم" ? values.rejection_country : null,
    has_previous_visas: values.has_previous_visas,
    previous_visa_countries:
      values.has_previous_visas === "نعم" ? values.previous_visa_countries : null,
    recommendation: values.recommendation || null,
    status: values.status,
  };
}

export function recordToFormDefaults(r: KYCRecordDto): Partial<KycFormValues> {
  return {
    employee_name: r.employee_name,
    client_full_name: r.client_full_name,
    age: r.age,
    passport_job_title: r.passport_job_title,
    other_job_title: r.other_job_title ?? "",
    service_type: normalizeServiceBranchForForm(r.service_type),
    assigned_to: (() => {
      const raw = r.assigned_to?.trim();
      if (raw && (KYC_ASSIGNEES as readonly string[]).includes(raw)) {
        return raw as KycFormValues["assigned_to"];
      }
      const st = normalizeServiceBranchForForm(r.service_type);
      const p = assignedPreview(st);
      if (p !== "—") return p as KycFormValues["assigned_to"];
      return KYC_ASSIGNEES[0];
    })(),
    has_bank_statement: r.has_bank_statement as KycFormValues["has_bank_statement"],
    available_balance:
      r.available_balance != null && r.available_balance !== ""
        ? String(r.available_balance)
        : "",
    expected_balance:
      r.expected_balance != null && r.expected_balance !== ""
        ? String(r.expected_balance)
        : "",
    has_property_assets: r.has_property_assets as KycFormValues["has_property_assets"],
    property_assets_detail: r.property_assets_detail ?? "",
    has_usd_account: r.has_usd_account as KycFormValues["has_usd_account"],
    has_bank_account: r.has_bank_account as KycFormValues["has_bank_account"],
    has_commercial_register_and_tax_card: r.has_commercial_register_and_tax_card as KycFormValues["has_commercial_register_and_tax_card"],
    marital_status: r.marital_status as KycFormValues["marital_status"],
    children_count: r.children_count ?? undefined,
    has_relatives_abroad: r.has_relatives_abroad as KycFormValues["has_relatives_abroad"],
    relatives_kinship: r.relatives_kinship ?? "",
    nationality_type: r.nationality_type as KycFormValues["nationality_type"],
    nationality: r.nationality ?? "",
    residency_status: (r.residency_status as KycFormValues["residency_status"]) ?? undefined,
    governorate: r.governorate,
    consultation_method: r.consultation_method as KycFormValues["consultation_method"],
    email: r.email,
    phone_number: r.phone_number,
    whatsapp_number: r.whatsapp_number,
    previous_rejected: r.previous_rejected as KycFormValues["previous_rejected"],
    rejection_numbers: r.rejection_numbers ?? "",
    rejection_reason: r.rejection_reason ?? "",
    rejection_country: r.rejection_country ?? "",
    has_previous_visas: r.has_previous_visas as KycFormValues["has_previous_visas"],
    previous_visa_countries: r.previous_visa_countries ?? "",
    recommendation: r.recommendation ?? "",
    status: r.status as KycFormValues["status"],
  };
}

export function toUpdatePayload(values: KycFormValues) {
  return toCreatePayload(values);
}
