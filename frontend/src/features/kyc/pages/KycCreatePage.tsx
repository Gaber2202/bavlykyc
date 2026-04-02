import { KycForm } from "@/features/kyc/components/KycForm";
import { apiFetch, formatApiErrorMessage } from "@/services/api";
import type { KYCRecordDto } from "@/types/api";
import { defaultKycValues } from "@/features/kyc/utils/kycZod";
import { toCreatePayload } from "@/features/kyc/utils/kycPayload";
import type { KycFormValues } from "@/features/kyc/utils/kycZod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function KycCreatePage() {
  const nav = useNavigate();

  async function onSubmit(values: KycFormValues) {
    try {
      const body = toCreatePayload(values);
      const row = await apiFetch<KYCRecordDto>("/kyc", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("تم إنشاء السجل");
      nav(`/kyc/${row.id}`);
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gold-200">إنشاء KYC جديد</h1>
      <KycForm
        defaultValues={defaultKycValues}
        submitLabel="حفظ السجل"
        onSubmit={onSubmit}
      />
    </div>
  );
}
