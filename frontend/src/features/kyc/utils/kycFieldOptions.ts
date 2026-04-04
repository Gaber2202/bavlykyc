/** Must match backend `app/constants/kyc_field_options.py`. */

export const SERVICE_BRANCHES = [
  "بافلي الاسكندرية",
  "بافلي القاهرة",
  "ترانس روفر الاسكندرية",
  "ترانس روفر القاهرة",
] as const;

export type ServiceBranch = (typeof SERVICE_BRANCHES)[number];

export const KINSHIP_RELATIONS = [
  "الأب",
  "الأم",
  "الأخ",
  "الأخت",
  "الزوج",
  "الزوجة",
  "الابن",
  "الابنة",
  "أخ غير شقيق",
  "أخت غير شقيقة",
  "الجد (من جهة الأب)",
  "الجدة (من جهة الأب)",
  "الجد (من جهة الأم)",
  "الجدة (من جهة الأم)",
  "العم",
  "العمة",
  "الخال",
  "الخالة",
  "ابن العم",
  "ابنة العم",
  "ابن العمة",
  "ابنة العمة",
  "ابن الخال",
  "ابنة الخال",
  "ابن الخالة",
  "ابنة الخالة",
  "الحفيد",
  "الحفيدة",
  "الكنة",
  "الصهر",
  "زوج الابن",
  "زوجة الابن",
  "زوج الابنة",
  "زوجة الابنة",
  "أخرى",
] as const;

export const KINSHIP_RELATIONS_SET = new Set<string>(KINSHIP_RELATIONS);
