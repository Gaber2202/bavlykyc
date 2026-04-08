import type { KYCRecordDto } from "@/types/api";

/** Single source for detail view + PDF export. */
export function getKycDetailSections(r: KYCRecordDto): {
  title: string;
  rows: [string, string][];
}[] {
  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: "البيانات الأساسية",
      rows: [
        ["اسم الموظف", r.employee_name],
        ["اسم العميل", r.client_full_name],
        ["العمر", String(r.age)],
        ["المسمى في الجواز", r.passport_job_title],
        ["مسمى آخر", r.other_job_title ?? "—"],
        ["فرع الخدمة", r.service_type],
        ["المكلف", r.assigned_to ?? "—"],
        ["تعيين تلقائي", r.assigned_by_rule ? "نعم" : "لا"],
      ],
    },
    {
      title: "المالية والاجتماعية",
      rows: [
        ["كشف حساب", r.has_bank_statement],
        ["رصيد متاح", r.available_balance ?? "—"],
        ["رصيد متوقع", r.expected_balance ?? "—"],
        ["هل يوجد أملاك؟", r.has_property_assets],
        ["تفاصيل الأملاك", r.property_assets_detail ?? "—"],
        ["حساب دولاري", r.has_usd_account],
        ["حساب بنكي مصري (وجود حساب)", r.has_bank_account],
        ["سجل تجاري وبطاقة ضريبية", r.has_commercial_register_and_tax_card],
        ["الحالة الاجتماعية", r.marital_status],
        ["الأطفال", r.children_count != null ? String(r.children_count) : "—"],
        ["هل ليك حد في الخارج؟", r.has_relatives_abroad],
        ["صلة القرابة", r.relatives_kinship ?? "—"],
        ["نوع الجنسية", r.nationality_type],
        ["الجنسية", r.nationality ?? "—"],
        ["الإقامة", r.residency_status ?? "—"],
        ["المحافظة", r.governorate],
      ],
    },
    {
      title: "التواصل",
      rows: [
        ["الاستشارة", r.consultation_method],
        ["البريد", r.email],
        ["الهاتف", r.phone_number],
        ["واتساب", r.whatsapp_number],
      ],
    },
    {
      title: "التأشيرات والرفض",
      rows: [
        ["رفض سابق", r.previous_rejected],
        ["أرقام الرفض", r.rejection_numbers ?? "—"],
        ["سبب الرفض", r.rejection_reason ?? "—"],
        ["دولة الرفض", r.rejection_country ?? "—"],
        ["تأشيرات سابقة", r.has_previous_visas],
        ["دول التأشيرات", r.previous_visa_countries ?? "—"],
      ],
    },
    {
      title: "التوصية والحالة",
      rows: [
        ["التوصية", r.recommendation ?? "—"],
        ["الحالة", r.status],
        ["أنشئ في", new Date(r.created_at).toLocaleString("ar-EG")],
        ["آخر تحديث", new Date(r.updated_at).toLocaleString("ar-EG")],
      ],
    },
  ];

  if (r.soft_deleted_at) {
    sections[sections.length - 1].rows.push([
      "محذوف منطقياً",
      new Date(r.soft_deleted_at).toLocaleString("ar-EG"),
    ]);
  }

  return sections;
}
