import type { KycFormValues } from "./kycZod";

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
    assigned_to_override: values.assigned_to_override || null,
    has_bank_statement: values.has_bank_statement,
    available_balance:
      values.has_bank_statement === "نعم" ? num(values.available_balance) : null,
    expected_balance:
      values.has_bank_statement === "لا" ? num(values.expected_balance) : null,
    marital_status: values.marital_status,
    children_count:
      values.marital_status === "متزوج" ? values.children_count ?? null : null,
    has_relatives_abroad: values.has_relatives_abroad,
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

export function recordToFormDefaults(r: {
  employee_name: string;
  client_full_name: string;
  age: number;
  passport_job_title: string;
  other_job_title: string | null;
  service_type: string;
  assigned_to: string | null;
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
}): Partial<KycFormValues> {
  return {
    employee_name: r.employee_name,
    client_full_name: r.client_full_name,
    age: r.age,
    passport_job_title: r.passport_job_title,
    other_job_title: r.other_job_title ?? "",
    service_type: r.service_type as KycFormValues["service_type"],
    assigned_to_override: "",
    has_bank_statement: r.has_bank_statement as KycFormValues["has_bank_statement"],
    available_balance:
      r.available_balance != null && r.available_balance !== ""
        ? String(r.available_balance)
        : "",
    expected_balance:
      r.expected_balance != null && r.expected_balance !== ""
        ? String(r.expected_balance)
        : "",
    marital_status: r.marital_status as KycFormValues["marital_status"],
    children_count: r.children_count ?? undefined,
    has_relatives_abroad: r.has_relatives_abroad as KycFormValues["has_relatives_abroad"],
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
