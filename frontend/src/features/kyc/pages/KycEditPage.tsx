import { KycForm } from "@/features/kyc/components/KycForm";
import { apiFetch, formatApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import type { KYCRecordDto } from "@/types/api";
import { recordToFormDefaults, toUpdatePayload } from "@/features/kyc/utils/kycPayload";
import { canEditKycRecord } from "@/features/kyc/utils/kycPermissions";
import { defaultKycValues, type KycFormValues } from "@/features/kyc/utils/kycZod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useEffect } from "react";

export function KycEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const kycEmployeeCanEditOthers = useAuthStore((s) => s.kycEmployeeCanEditOthers);

  const q = useQuery({
    queryKey: ["kyc", id],
    queryFn: () => apiFetch<KYCRecordDto>(`/kyc/${id}`),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (q.isError) toast.error(formatApiErrorMessage(q.error));
  }, [q.isError, q.error]);

  if (q.isLoading) {
    return (
      <div className="text-gold-400 py-16 text-center rounded-xl border border-gold-800/30">
        جاري التحميل…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        <p className="text-red-400/90">تعذر تحميل السجل</p>
        <Link to="/kyc" className="btn-ghost inline-block text-sm">
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const canEdit = canEditKycRecord(user, q.data, kycEmployeeCanEditOthers);

  async function onSubmit(values: KycFormValues) {
    try {
      await apiFetch(`/kyc/${id}`, {
        method: "PATCH",
        body: JSON.stringify(toUpdatePayload(values)),
      });
      toast.success("تم حفظ التعديلات بنجاح");
      nav(`/kyc/${id}`);
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    }
  }

  if (!canEdit) {
    return (
      <div className="max-w-lg space-y-4 glass-panel p-8 border-amber-900/40">
        <h1 className="text-xl font-semibold text-gold-200">لا يمكن التعديل</h1>
        <p className="text-gold-400 text-sm leading-relaxed">
          {q.data.soft_deleted_at != null
            ? "هذا السجل محذوف منطقياً ولا يمكن تعديله."
            : "سياسة النظام تسمح لك بتعديل السجلات التي أنشأها حسابك فقط، ما لم يمنحك المسؤول صلاحية تعديل سجلات الآخرين."}
        </p>
        <Link to={`/kyc/${id}`} className="btn-ghost inline-block text-sm">
          العودة للتفاصيل
        </Link>
      </div>
    );
  }

  const merged = { ...defaultKycValues, ...recordToFormDefaults(q.data) };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gold-200">تعديل KYC</h1>
        <Link to={`/kyc/${id}`} className="btn-ghost text-sm">
          إلغاء والعودة
        </Link>
      </div>
      <KycForm defaultValues={merged} submitLabel="حفظ التعديلات" onSubmit={onSubmit} />
    </div>
  );
}
