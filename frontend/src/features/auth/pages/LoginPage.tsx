import {
  formatApiErrorMessage,
  loginRequest,
  meRequest,
  persistTokens,
} from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function LoginPage() {
  const { user, hydrated, applyMe } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (hydrated && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await loginRequest(username, password);
      persistTokens(tokens);
      const me = await meRequest();
      applyMe(me);
      toast.success("تم تسجيل الدخول");
      nav("/");
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs uppercase tracking-[0.35em] text-gold-500">
            Bavly KYC
          </div>
          <h1 className="text-2xl font-bold text-gold-200">تسجيل الدخول</h1>
          <p className="text-sm text-gold-400">نظام إدارة اعرف عميلك الداخلي</p>
        </div>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block text-sm">
            <span className="text-gold-300 mb-1 block">اسم المستخدم</span>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gold-300 mb-1 block">كلمة المرور</span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "جارٍ الدخول…" : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
