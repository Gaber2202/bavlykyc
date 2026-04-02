import { z } from "zod";

const YES = "نعم";
const NO = "لا";

export const kycFormSchema = z
  .object({
    employee_name: z.string().min(1),
    client_full_name: z.string().min(1),
    age: z.coerce.number().min(0).max(120),
    passport_job_title: z.string().min(1),
    other_job_title: z.string().optional().nullable(),
    service_type: z.enum(["بافلي", "ترانس روفر", "أخرى"]),
    assigned_to_override: z.string().optional().nullable(),
    has_bank_statement: z.enum([YES, NO]),
    available_balance: z.string().optional().nullable(),
    expected_balance: z.string().optional().nullable(),
    marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"]),
    children_count: z.coerce.number().min(0).max(50).optional().nullable(),
    has_relatives_abroad: z.enum([YES, NO]),
    nationality_type: z.enum(["مصري", "غير مصري"]),
    nationality: z.string().optional().nullable(),
    residency_status: z.enum([YES, NO]).optional().nullable(),
    governorate: z.string().min(1),
    consultation_method: z.enum(["مقابلة", "فون", "فيديوكول"]),
    email: z.string().email(),
    phone_number: z.string().min(3),
    whatsapp_number: z.string().min(3),
    previous_rejected: z.enum([YES, NO]),
    rejection_numbers: z.string().optional().nullable(),
    rejection_reason: z.string().optional().nullable(),
    rejection_country: z.string().optional().nullable(),
    has_previous_visas: z.enum([YES, NO]),
    previous_visa_countries: z.string().optional().nullable(),
    recommendation: z.string().optional().nullable(),
    status: z.enum([
      "مسودة",
      "قيد المراجعة",
      "موافق",
      "مرفوض",
      "مكتمل",
    ]),
  })
  .superRefine((data, ctx) => {
    if (data.has_bank_statement === YES) {
      if (!data.available_balance?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["available_balance"],
          message: "مطلوب",
        });
      }
      if (data.expected_balance?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expected_balance"],
          message: "يجب إفراغ الحقل",
        });
      }
    }
    if (data.has_bank_statement === NO) {
      if (!data.expected_balance?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expected_balance"],
          message: "مطلوب",
        });
      }
      if (data.available_balance?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["available_balance"],
          message: "يجب إفراغ الحقل",
        });
      }
    }
    if (data.marital_status === "متزوج") {
      if (data.children_count === null || data.children_count === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["children_count"],
          message: "مطلوب",
        });
      }
    } else if (data.children_count !== null && data.children_count !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["children_count"],
        message: "غير مطلوب",
      });
    }
    if (data.nationality_type === "غير مصري") {
      if (!(data.nationality ?? "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nationality"],
          message: "مطلوب",
        });
      }
      if (!data.residency_status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["residency_status"],
          message: "مطلوب",
        });
      }
    } else {
      if ((data.nationality ?? "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nationality"],
          message: "غير مطلوب",
        });
      }
      if (data.residency_status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["residency_status"],
          message: "غير مطلوب",
        });
      }
    }
    if (data.previous_rejected === YES) {
      for (const [path, label] of [
        ["rejection_numbers", "أرقام الرفض"],
        ["rejection_reason", "السبب"],
        ["rejection_country", "الدولة"],
      ] as const) {
        if (!(data[path] as string | null | undefined)?.toString().trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path],
            message: `${label} مطلوب`,
          });
        }
      }
    } else {
      for (const path of [
        "rejection_numbers",
        "rejection_reason",
        "rejection_country",
      ] as const) {
        if ((data[path] as string | null | undefined)?.toString().trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path],
            message: "غير مطلوب",
          });
        }
      }
    }
    if (data.has_previous_visas === YES) {
      if (!(data.previous_visa_countries ?? "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["previous_visa_countries"],
          message: "مطلوب",
        });
      }
    } else if ((data.previous_visa_countries ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["previous_visa_countries"],
        message: "غير مطلوب",
      });
    }
  });

export type KycFormValues = z.infer<typeof kycFormSchema>;

export const defaultKycValues: KycFormValues = {
  employee_name: "",
  client_full_name: "",
  age: 0,
  passport_job_title: "",
  other_job_title: "",
  service_type: "بافلي",
  assigned_to_override: "",
  has_bank_statement: NO,
  available_balance: "",
  expected_balance: "",
  marital_status: "أعزب",
  children_count: undefined,
  has_relatives_abroad: NO,
  nationality_type: "مصري",
  nationality: "",
  residency_status: undefined,
  governorate: "",
  consultation_method: "مقابلة",
  email: "",
  phone_number: "",
  whatsapp_number: "",
  previous_rejected: NO,
  rejection_numbers: "",
  rejection_reason: "",
  rejection_country: "",
  has_previous_visas: NO,
  previous_visa_countries: "",
  recommendation: "",
  status: "مسودة",
};

export function assignedPreview(serviceType: string) {
  if (serviceType === "بافلي") return "أحمد الشيخ";
  if (serviceType === "ترانس روفر") return "محمود الشيخ";
  return "— (يمكن للمسؤول التعيين اليدوي)";
}
