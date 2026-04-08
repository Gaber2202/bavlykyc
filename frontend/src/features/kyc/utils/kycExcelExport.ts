import type { KycListFilterState } from "@/features/kyc/utils/kycListQuery";
import { buildKycListQueryParams } from "@/features/kyc/utils/kycListQuery";
import type { KYCRecordDto, PaginatedResponse } from "@/types/api";

type ApiFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

const EXPORT_PAGE_SIZE = 200;

const EXPORT_COLUMNS: {
  key: keyof KYCRecordDto;
  header: string;
  width: number;
}[] = [
  { key: "id", header: "المعرف", width: 38 },
  { key: "employee_name", header: "الموظف", width: 22 },
  { key: "client_full_name", header: "اسم العميل", width: 24 },
  { key: "age", header: "العمر", width: 8 },
  { key: "phone_number", header: "الهاتف", width: 16 },
  { key: "whatsapp_number", header: "واتساب", width: 16 },
  { key: "email", header: "البريد", width: 28 },
  { key: "service_type", header: "فرع الخدمة", width: 22 },
  { key: "assigned_to", header: "المكلف", width: 18 },
  { key: "status", header: "الحالة", width: 14 },
  { key: "governorate", header: "المحافظة", width: 14 },
  { key: "marital_status", header: "الحالة الاجتماعية", width: 16 },
  { key: "relatives_kinship", header: "صلة القرابة", width: 18 },
  { key: "nationality_type", header: "نوع الجنسية", width: 14 },
  { key: "nationality", header: "الجنسية", width: 14 },
  { key: "passport_job_title", header: "المسمى في الجواز", width: 20 },
  { key: "consultation_method", header: "طريقة الاستشارة", width: 14 },
  { key: "has_bank_statement", header: "كشف بنكي", width: 12 },
  { key: "has_property_assets", header: "أملاك", width: 10 },
  { key: "property_assets_detail", header: "تفاصيل الأملاك", width: 36 },
  { key: "has_usd_account", header: "حساب دولاري", width: 14 },
  { key: "has_bank_account", header: "حساب بنكي مصري", width: 16 },
  {
    key: "has_commercial_register_and_tax_card",
    header: "سجل تجاري وضريبة",
    width: 18,
  },
  { key: "previous_rejected", header: "رفض سابق", width: 12 },
  { key: "has_previous_visas", header: "تأشيرات سابقة", width: 14 },
  { key: "recommendation", header: "التوصية", width: 32 },
  { key: "created_at", header: "تاريخ الإنشاء", width: 22 },
  { key: "updated_at", header: "آخر تحديث", width: 22 },
  { key: "soft_deleted_at", header: "تاريخ الحذف (منطقي)", width: 22 },
];

function cellValue(row: KYCRecordDto, key: keyof KYCRecordDto): string | number {
  const v = row[key];
  if (v === null || v === undefined) return "";
  if (key === "created_at" || key === "updated_at" || key === "soft_deleted_at") {
    if (typeof v !== "string" || !v) return "";
    return new Date(v).toLocaleString("ar-EG");
  }
  if (typeof v === "number") return v;
  return String(v);
}

/** Fetch every row matching current filters (same as list API, all pages). */
export async function fetchAllKycForExport(
  apiFetch: ApiFetch,
  filters: KycListFilterState,
): Promise<KYCRecordDto[]> {
  const all: KYCRecordDto[] = [];
  let page = 1;
  let total = 0;
  do {
    const q = buildKycListQueryParams(filters, page, EXPORT_PAGE_SIZE);
    const res = await apiFetch<PaginatedResponse<KYCRecordDto>>(`/kyc?${q.toString()}`);
    all.push(...res.items);
    total = res.meta.total;
    if (res.items.length === 0) break;
    page += 1;
  } while (all.length < total);
  return all;
}

export async function downloadKycExcel(rows: KYCRecordDto[]): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bavly KYC";
  const sheet = workbook.addWorksheet("سجلات KYC", {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = EXPORT_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  for (const row of rows) {
    const record: Record<string, string | number> = {};
    for (const col of EXPORT_COLUMNS) {
      record[col.key as string] = cellValue(row, col.key);
    }
    sheet.addRow(record);
  }

  sheet.getRow(1).font = { bold: true };

  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const name = `kyc-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
