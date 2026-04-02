import { Card } from "@/shared/ui/Card";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center" title="الصفحة غير موجودة">
        <p className="text-gold-500 text-sm leading-relaxed mb-6">
          الرابط غير صالح أو تم نقل المحتوى. تحقق من العنوان أو ارجع إلى لوحة التحكم.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary px-5 py-2 rounded-lg text-sm font-semibold">
            لوحة التحكم
          </Link>
          <Link to="/kyc" className="btn-ghost px-5 py-2 rounded-lg text-sm">
            سجلات KYC
          </Link>
        </div>
      </Card>
    </div>
  );
}
