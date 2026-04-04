import { z } from "zod";

import {
  KINSHIP_RELATIONS_SET,
  KYC_ASSIGNEES,
  SERVICE_BRANCHES,
} from "@/features/kyc/utils/kycFieldOptions";

const YES = "نعم";
const NO = "لا";

const serviceBranchEnum = z.enum(SERVICE_BRANCHES as unknown as [string, ...string[]]);
const assigneeEnum = z.enum(KYC_ASSIGNEES as unknown as [string, ...string[]]);

/** Default assignee label from فرع الخدمة (user may override in the form). */
export function assignedPreview(serviceType: string) {
  const s = serviceType.trim();
  if (s.startsWith("بافلي")) return "أحمد الشيخ";
  if (s.startsWith("ترانس روفر")) return "محمود الشيخ";
  return "—";
}

export const kycFormSchema = z
  .object({
    employee_name: z.string().min(1),
    client_full_name: z.string().min(1),
    age: z.coerce.number().min(0).max(120),
    passport_job_title: z.string().min(1),
    other_job_title: z.string().optional().nullable(),
    service_type: serviceBranchEnum,
    assigned_to: assigneeEnum,
    has_bank_statement: z.enum([YES, NO]),
    available_balance: z.string().optional().nullable(),
    expected_balance: z.string().optional().nullable(),
    marital_status: z.enum(["أعزب", "متزوج", "مطلق", "أرمل"]),
    children_count: z.coerce.number().min(0).max(50).optional().nullable(),
    has_relatives_abroad: z.enum([YES, NO]),
    relatives_kinship: z.string().optional().nullable(),
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
    if (data.has_relatives_abroad === YES) {
      const rk = (data.relatives_kinship ?? "").trim();
      if (!rk) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["relatives_kinship"],
          message: "مطلوب",
        });
      } else if (!KINSHIP_RELATIONS_SET.has(rk)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["relatives_kinship"],
          message: "قيمة غير صالحة",
        });
      }
    } else if ((data.relatives_kinship ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatives_kinship"],
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
  service_type: SERVICE_BRANCHES[0],
  assigned_to: assignedPreview(SERVICE_BRANCHES[0]),
  has_bank_statement: NO,
  available_balance: "",
  expected_balance: "",
  marital_status: "أعزب",
  children_count: undefined,
  has_relatives_abroad: NO,
  relatives_kinship: "",
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
