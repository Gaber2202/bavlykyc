import { apiFetch, formatApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import type { KYCRecordDto } from "@/types/api";
import {
  canAdminSoftDeleteKyc,
  canEditKycRecord,
} from "@/features/kyc/utils/kycPermissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useEffect } from "react";

export function KycDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const kycEmployeeCanEditOthers = useAuthStore((s) => s.kycEmployeeCanEditOthers);

  const q = useQuery({
    queryKey: ["kyc", id],
    queryFn: () => apiFetch<KYCRecordDto>(`/kyc/${id}`),
    enabled: Boolean(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("missing id");
      return apiFetch<void>(`/kyc/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("تم الحذف المنطقي للسجل");
      void qc.invalidateQueries({ queryKey: ["kyc"] });
      nav("/kyc");
    },
    onError: (e) => toast.error(formatApiErrorMessage(e)),
  });

  useEffect(() => {
    if (q.isError) toast.error(formatApiErrorMessage(q.error));
  }, [q.isError, q.error]);

  if (q.isLoading) {
    return (
      <div className="text-gold-400 py-16 text-center border border-gold-800/30 rounded-xl">
        جاري التحميل…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="text-red-400/90 py-16 text-center rounded-xl border border-red-900/40 bg-red-950/20">
        تعذر عرض السجل
      </div>
    );
  }

  const r = q.data;
  const canEdit = canEditKycRecord(user, r, kycEmployeeCanEditOthers);
  const canDelete = canAdminSoftDeleteKyc(user, r);

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

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gold-200">تفاصيل KYC</h1>
          <p className="text-gold-600 text-sm mt-1 font-mono dir-ltr text-right">{r.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Link className="btn-primary text-sm px-5" to={`/kyc/${r.id}/edit`}>
              تعديل السجل
            </Link>
          ) : (
            <span className="text-gold-600 text-sm border border-gold-800/50 rounded-lg px-3 py-2 bg-ink/60">
              لا تملك صلاحية التعديل على هذا السجل
            </span>
          )}
          {canDelete && (
            <button
              type="button"
              className="text-sm px-4 py-2 rounded-lg border border-red-800/60 text-red-300/95 hover:bg-red-950/40 transition disabled:opacity-50"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    "حذف منطقي لهذا السجل؟ لن يظهر في القوائم العادية ويمكن للمسؤول عرضه عند تفعيل «عرض المحذوفة».",
                  )
                ) {
                  return;
                }
                deleteMut.mutate();
              }}
            >
              {deleteMut.isPending ? "جاري الحذف…" : "حذف منطقي (مسؤول)"}
            </button>
          )}
        </div>
      </div>

      {r.soft_deleted_at && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-amber-200 text-sm">
          هذا السجل محذوف (عرض المسؤول)
        </div>
      )}

      <div className="space-y-6">
        {sections.map((sec) => (
          <section key={sec.title} className="glass-panel overflow-hidden border-gold-500/12">
            <h2 className="text-gold-300 font-semibold px-4 py-3 border-b border-gold-800/40 bg-gold-900/10">
              {sec.title}
            </h2>
            <div className="divide-y divide-gold-900/35">
              {sec.rows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 px-4 py-3 text-sm items-start"
                >
                  <span className="text-gold-500 shrink-0">{k}</span>
                  <span className="text-gold-100 text-left break-all max-w-[65%]">{v}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link to="/kyc" className="btn-ghost inline-block text-sm">
        ← قائمة KYC
      </Link>
    </div>
  );
}
