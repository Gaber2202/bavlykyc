import {
  changePasswordRequest,
  formatApiErrorMessage,
  meRequest,
  persistTokens,
} from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function ChangePasswordPage() {
  const user = useAuthStore((s) => s.user);
  const applyMe = useAuthStore((s) => s.applyMe);
  const nav = useNavigate();
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user?.must_change_password) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nextPw.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (nextPw !== confirm) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }
    setLoading(true);
    try {
      const pair = await changePasswordRequest(currentPw, nextPw);
      persistTokens(pair);
      const me = await meRequest();
      applyMe(me);
      toast.success("تم تحديث كلمة المرور");
      nav("/", { replace: true });
    } catch (err) {
      toast.error(formatApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink">
      <div className="w-full max-w-md glass-panel p-8 space-y-6 border-gold-500/25">
        <div className="text-center space-y-2">
          <div className="text-xs uppercase tracking-[0.35em] text-gold-500">
            أمان الحساب
          </div>
          <h1 className="text-xl font-bold text-gold-200">تغيير كلمة المرور مطلوب</h1>
          <p className="text-sm text-gold-500 leading-relaxed">
            تم تعيين كلمة مرور مؤقتة لحسابك. اختر كلمة مرور جديدة قوية قبل متابعة العمل.
          </p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block text-sm">
            <span className="text-gold-300 mb-1 block">كلمة المرور الحالية</span>
            <input
              type="password"
              className="input-field"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gold-300 mb-1 block">كلمة المرور الجديدة</span>
            <input
              type="password"
              className="input-field"
              value={nextPw}
              onChange={(e) => setNextPw(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gold-300 mb-1 block">تأكيد الجديدة</span>
            <input
              type="password"
              className="input-field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "جارٍ الحفظ…" : "تحديث كلمة المرور"}
          </button>
        </form>
      </div>
    </div>
  );
}
