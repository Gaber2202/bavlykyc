import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Link } from "react-router-dom";

function DashCard({
  to,
  title,
  description,
  accent,
}: {
  to: string;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group block rounded-xl border transition p-5 h-full ${
        accent
          ? "border-gold-500/40 bg-gradient-to-br from-gold-900/25 to-ink hover:border-gold-400/60"
          : "border-gold-800/40 bg-ink/50 hover:border-gold-600/40 hover:bg-gold-900/10"
      }`}
    >
      <h3 className="text-gold-200 font-semibold group-hover:text-gold-100 transition">{title}</h3>
      <p className="text-sm text-gold-600 mt-2 leading-relaxed">{description}</p>
      <span className="inline-flex mt-4 text-xs text-gold-400 group-hover:text-gold-300">
        انتقل ←
      </span>
    </Link>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title={`مرحباً، ${user?.full_name ?? ""}`}
        description="نقطة انطلاق سريعة لإدارة سجلات الاعرف عميلك والوصول إلى الأدوات حسب صلاحيتك."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <DashCard
          to="/kyc"
          accent
          title="سجلات KYC"
          description="عرض وتصفية السجلات مع ترقيم وفرز وأعمدة واضحة."
        />
        <DashCard
          to="/kyc/new"
          title="سجل جديد"
          description="إنشاء طلب KYC جديد مع التحقق من الحقول الشرطية."
        />
        {isAdmin && (
          <>
            <DashCard
              to="/users"
              title="المستخدمون"
              description="إدارة الحسابات، الأدوار، وإعادة تعيين كلمات المرور."
            />
            <DashCard
              to="/reports"
              title="التقارير"
              description="مؤشرات الأداء، الاتجاهات، والتوزيعات التحليلية."
            />
          </>
        )}
      </div>

      <Card title="لمحة سريعة" subtitle="اختصارات للمهام الأكثر استخداماً">
        <ul className="text-sm text-gold-400 space-y-2">
          <li>
            • جميع البيانات محمية بتسجيل الدخول؛{" "}
            <Link to="/kyc/new" className="text-gold-300 underline hover:text-gold-200">
              ابدأ سجلاً جديداً
            </Link>
          </li>
          {isAdmin && (
            <li>
              • راجع{" "}
              <Link to="/audit" className="text-gold-300 underline hover:text-gold-200">
                سجل النشاط
              </Link>{" "}
              للتدقيق والامتثال.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
