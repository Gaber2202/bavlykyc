import { apiFetch, formatApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import type { KYCRecordDto } from "@/types/api";
import { KycDetailPdfLayout } from "@/features/kyc/components/KycDetailPdfLayout";
import {
  canAdminSoftDeleteKyc,
  canEditKycRecord,
} from "@/features/kyc/utils/kycPermissions";
import {
  buildKycPdfFilename,
  exportKycDetailToPdf,
} from "@/features/kyc/utils/exportKycDetailPdf";
import { getKycDetailSections } from "@/features/kyc/utils/kycDetailSections";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

export function KycDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const pdfRootRef = useRef<HTMLDivElement>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
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
  const sections = getKycDetailSections(r);
  const pdfGeneratedLabel = `أُنشئ المستند: ${new Date().toLocaleString("ar-EG")}`;

  async function handleExportPdf() {
    const el = pdfRootRef.current;
    if (!el) {
      toast.error("تعذر تجهيز الملف");
      return;
    }
    setPdfExporting(true);
    try {
      await exportKycDetailToPdf(el, buildKycPdfFilename(r));
      toast.success("تم تنزيل PDF");
    } catch {
      toast.error("تعذر إنشاء PDF");
    } finally {
      setPdfExporting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gold-200">تفاصيل KYC</h1>
          <p className="text-gold-600 text-sm mt-1 font-mono dir-ltr text-right">{r.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="text-sm px-4 py-2 rounded-lg border border-gold-700/60 text-gold-200 hover:bg-gold-900/25 transition disabled:opacity-50"
            disabled={pdfExporting}
            onClick={() => void handleExportPdf()}
          >
            {pdfExporting ? "جاري PDF…" : "تنزيل PDF"}
          </button>
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

      <KycDetailPdfLayout
        ref={pdfRootRef}
        sections={sections}
        recordId={r.id}
        clientFullName={r.client_full_name}
        generatedLabel={pdfGeneratedLabel}
      />
    </div>
  );
}
