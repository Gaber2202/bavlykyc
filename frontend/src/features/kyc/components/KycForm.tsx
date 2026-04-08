import {
  KINSHIP_RELATIONS,
  KYC_ASSIGNEES,
  SERVICE_BRANCHES,
} from "@/features/kyc/utils/kycFieldOptions";
import {
  kycFormSchema,
  defaultKycValues,
  type KycFormValues,
  assignedPreview,
} from "@/features/kyc/utils/kycZod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useRef, type ReactNode } from "react";
import { useForm, type Resolver } from "react-hook-form";

interface Props {
  defaultValues?: Partial<KycFormValues>;
  submitLabel: string;
  onSubmit: (values: KycFormValues) => Promise<void> | void;
  disabled?: boolean;
}

export function KycForm({ defaultValues, submitLabel, onSubmit, disabled }: Props) {
  const user = useAuthStore((s) => s.user);
  const lockedEmployeeName = user?.full_name?.trim() || user?.username?.trim() || "";

  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycFormSchema) as Resolver<KycFormValues>,
    defaultValues: { ...defaultKycValues, ...defaultValues } as KycFormValues,
  });

  useEffect(() => {
    form.setValue("employee_name", lockedEmployeeName, { shouldValidate: true });
  }, [lockedEmployeeName, form]);

  const hbs = form.watch("has_bank_statement");
  const hasProp = form.watch("has_property_assets");
  const marital = form.watch("marital_status");
  const nat = form.watch("nationality_type");
  const prevRej = form.watch("previous_rejected");
  const prevVisa = form.watch("has_previous_visas");
  const svc = form.watch("service_type");
  const relAbroad = form.watch("has_relatives_abroad");
  const prevServiceBranchRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevServiceBranchRef.current === undefined) {
      prevServiceBranchRef.current = svc;
      return;
    }
    if (prevServiceBranchRef.current !== svc) {
      const next = assignedPreview(svc);
      if (next !== "—") {
        form.setValue("assigned_to", next, { shouldValidate: true });
      }
      prevServiceBranchRef.current = svc;
    }
  }, [svc, form]);

  // Keep hidden conditional fields cleared (matches backend `clear_conditional_fields_for_write`).
  useEffect(() => {
    if (hbs === "نعم") {
      form.setValue("expected_balance", "");
    } else if (hbs === "لا") {
      form.setValue("available_balance", "");
    }
  }, [hbs, form]);

  useEffect(() => {
    if (marital !== "متزوج") {
      form.setValue("children_count", undefined);
    }
  }, [marital, form]);

  useEffect(() => {
    if (nat !== "غير مصري") {
      form.setValue("nationality", "");
      form.setValue("residency_status", undefined);
    }
  }, [nat, form]);

  useEffect(() => {
    if (prevRej !== "نعم") {
      form.setValue("rejection_numbers", "");
      form.setValue("rejection_reason", "");
      form.setValue("rejection_country", "");
    }
  }, [prevRej, form]);

  useEffect(() => {
    if (prevVisa !== "نعم") {
      form.setValue("previous_visa_countries", "");
    }
  }, [prevVisa, form]);

  useEffect(() => {
    if (relAbroad !== "نعم") {
      form.setValue("relatives_kinship", "");
    }
  }, [relAbroad, form]);

  return (
    <form
      className="space-y-10 max-w-4xl"
      onSubmit={form.handleSubmit(async (v) => onSubmit(v))}
    >
      <section className="glass-panel p-5 space-y-4">
        <SectionTitle n={1} title="البيانات الأساسية" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="اسم الموظف" error={form.formState.errors.employee_name}>
            <input
              type="text"
              readOnly
              title="يُعبأ تلقائياً من اسم المستخدم المسجّل"
              className="input-field cursor-default bg-ink/50 text-gold-200/90"
              {...form.register("employee_name")}
            />
          </Field>
          <Field label="اسم العميل الكامل" error={form.formState.errors.client_full_name}>
            <input className="input-field" {...form.register("client_full_name")} />
          </Field>
          <Field label="العمر" error={form.formState.errors.age}>
            <input type="number" className="input-field" {...form.register("age")} />
          </Field>
          <Field label="المسمى الوظيفي في الجواز" error={form.formState.errors.passport_job_title}>
            <input className="input-field" {...form.register("passport_job_title")} />
          </Field>
          <Field label="مسمى وظيفي آخر (اختياري)" error={form.formState.errors.other_job_title}>
            <input className="input-field" {...form.register("other_job_title")} />
          </Field>
          <Field label="فرع الخدمة" error={form.formState.errors.service_type}>
            <select className="input-field" {...form.register("service_type")}>
              {SERVICE_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="المكلَّف بالمتابعة"
            error={form.formState.errors.assigned_to}
            hint={
              <p className="text-gold-600 text-xs mt-1.5 leading-relaxed">
                يُقترح تلقائياً حسب فرع الخدمة؛ يمكنك اختيار أحمد الشيخ أو محمود الشيخ يدوياً.
              </p>
            }
          >
            <select className="input-field" {...form.register("assigned_to")}>
              {KYC_ASSIGNEES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="glass-panel p-5 space-y-4">
        <SectionTitle n={2} title="المالية والاجتماعية" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="كشف حساب بنكي" error={form.formState.errors.has_bank_statement}>
            <select className="input-field" {...form.register("has_bank_statement")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          {hbs === "نعم" && (
            <Field label="الرصيد المتاح" error={form.formState.errors.available_balance}>
              <input className="input-field" dir="ltr" {...form.register("available_balance")} />
            </Field>
          )}
          {hbs === "لا" && (
            <Field label="الرصيد المتوقع" error={form.formState.errors.expected_balance}>
              <input className="input-field" dir="ltr" {...form.register("expected_balance")} />
            </Field>
          )}
          <Field label="هل يوجد أملاك؟" error={form.formState.errors.has_property_assets}>
            <select className="input-field" {...form.register("has_property_assets")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          {hasProp === "نعم" && (
            <div className="md:col-span-2">
              <Field label="تفاصيل الأملاك" error={form.formState.errors.property_assets_detail}>
                <textarea
                  className="input-field min-h-[88px] resize-y"
                  rows={3}
                  {...form.register("property_assets_detail")}
                />
              </Field>
            </div>
          )}
          <Field label="هل يوجد حساب دولاري؟" error={form.formState.errors.has_usd_account}>
            <select className="input-field" {...form.register("has_usd_account")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          <Field
            label="هل يوجد حساب بنكي مصري؟ (وجود حساب، وليس كشف الحساب)"
            error={form.formState.errors.has_bank_account}
          >
            <select className="input-field" {...form.register("has_bank_account")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          <Field
            label="هل يوجد سجل تجاري وبطاقة ضريبية؟"
            error={form.formState.errors.has_commercial_register_and_tax_card}
          >
            <select className="input-field" {...form.register("has_commercial_register_and_tax_card")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          <Field label="الحالة الاجتماعية" error={form.formState.errors.marital_status}>
            <select className="input-field" {...form.register("marital_status")}>
              <option value="أعزب">أعزب</option>
              <option value="متزوج">متزوج</option>
              <option value="مطلق">مطلق</option>
              <option value="أرمل">أرمل</option>
            </select>
          </Field>
          {marital === "متزوج" && (
            <Field label="عدد الأطفال" error={form.formState.errors.children_count}>
              <input type="number" className="input-field" {...form.register("children_count")} />
            </Field>
          )}
          <Field label="هل ليك حد في الخارج؟" error={form.formState.errors.has_relatives_abroad}>
            <select className="input-field" {...form.register("has_relatives_abroad")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          {relAbroad === "نعم" && (
            <Field label="صلة القرابة" error={form.formState.errors.relatives_kinship}>
              <select className="input-field" {...form.register("relatives_kinship")}>
                <option value="">اختر صلة القرابة</option>
                {KINSHIP_RELATIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="نوع الجنسية" error={form.formState.errors.nationality_type}>
            <select className="input-field" {...form.register("nationality_type")}>
              <option value="مصري">مصري</option>
              <option value="غير مصري">غير مصري</option>
            </select>
          </Field>
          {nat === "غير مصري" && (
            <>
              <Field label="الجنسية" error={form.formState.errors.nationality}>
                <input className="input-field" {...form.register("nationality")} />
              </Field>
              <Field label="حالة الإقامة" error={form.formState.errors.residency_status}>
                <select className="input-field" {...form.register("residency_status")}>
                  <option value="">اختر</option>
                  <option value="نعم">نعم</option>
                  <option value="لا">لا</option>
                </select>
              </Field>
            </>
          )}
          <Field label="المحافظة" error={form.formState.errors.governorate}>
            <input className="input-field" {...form.register("governorate")} />
          </Field>
        </div>
      </section>

      <section className="glass-panel p-5 space-y-4">
        <SectionTitle n={3} title="التواصل والاستشارة" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="طريقة الاستشارة" error={form.formState.errors.consultation_method}>
            <select className="input-field" {...form.register("consultation_method")}>
              <option value="مقابلة">مقابلة</option>
              <option value="فون">فون</option>
              <option value="فيديوكول">فيديوكول</option>
            </select>
          </Field>
          <Field label="البريد الإلكتروني" error={form.formState.errors.email}>
            <input type="email" className="input-field" dir="ltr" {...form.register("email")} />
          </Field>
          <Field label="الهاتف" error={form.formState.errors.phone_number}>
            <input className="input-field" dir="ltr" {...form.register("phone_number")} />
          </Field>
          <Field label="واتساب" error={form.formState.errors.whatsapp_number}>
            <input className="input-field" dir="ltr" {...form.register("whatsapp_number")} />
          </Field>
        </div>
      </section>

      <section className="glass-panel p-5 space-y-4">
        <SectionTitle n={4} title="التأشيرات والرفض" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="رفض سابق" error={form.formState.errors.previous_rejected}>
            <select className="input-field" {...form.register("previous_rejected")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          {prevRej === "نعم" && (
            <>
              <Field label="أرقام الرفض" error={form.formState.errors.rejection_numbers}>
                <input className="input-field" {...form.register("rejection_numbers")} />
              </Field>
              <Field label="سبب الرفض" error={form.formState.errors.rejection_reason}>
                <textarea className="input-field min-h-[80px]" {...form.register("rejection_reason")} />
              </Field>
              <Field label="دولة الرفض" error={form.formState.errors.rejection_country}>
                <input className="input-field" {...form.register("rejection_country")} />
              </Field>
            </>
          )}
          <Field label="تأشيرات سابقة" error={form.formState.errors.has_previous_visas}>
            <select className="input-field" {...form.register("has_previous_visas")}>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </Field>
          {prevVisa === "نعم" && (
            <Field label="دول التأشيرات" error={form.formState.errors.previous_visa_countries}>
              <textarea className="input-field min-h-[80px]" {...form.register("previous_visa_countries")} />
            </Field>
          )}
        </div>
      </section>

      <section className="glass-panel p-5 space-y-4">
        <SectionTitle n={5} title="التوصية والحالة" />
        <Field label="التوصية" error={form.formState.errors.recommendation}>
          <textarea className="input-field min-h-[100px]" {...form.register("recommendation")} />
        </Field>
        <Field label="الحالة" error={form.formState.errors.status}>
          <select className="input-field" {...form.register("status")}>
            <option value="مسودة">مسودة</option>
            <option value="قيد المراجعة">قيد المراجعة</option>
            <option value="موافق">موافق</option>
            <option value="مرفوض">مرفوض</option>
            <option value="مكتمل">مكتمل</option>
          </select>
        </Field>
      </section>

      <button type="submit" className="btn-primary px-8" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-gold-300 font-semibold border-b border-gold-700/40 pb-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gold-500/60 bg-gradient-to-br from-gold-900/50 to-ink text-sm font-bold text-gold-200 shadow-lg shadow-black/50">
        {n}
      </span>
      {title}
    </h2>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: { message?: string };
  hint?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gold-300/90 mb-1.5 block font-medium">{label}</span>
      {children}
      {hint}
      {error?.message && (
        <span className="text-red-400/95 text-xs mt-1.5 block">{error.message}</span>
      )}
    </label>
  );
}
