import { BavlyTravelLogo } from "@/shared/components/BavlyTravelLogo";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/stores/authStore";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-lg px-3 py-2.5 text-sm font-medium transition border border-transparent",
    isActive
      ? "bg-gold-400/15 text-gold-200 border-gold-500/35 shadow-sm shadow-gold-900/20"
      : "text-gold-300/90 hover:bg-gold-900/20 hover:border-gold-800/30",
  );

const sectionLabel = "text-[10px] uppercase tracking-widest text-gold-600 px-1 mb-1";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="w-64 shrink-0 border-l border-gold-700/25 bg-gradient-to-b from-ink-100/95 to-ink/98 flex flex-col min-h-screen">
      <div className="p-3 border-b border-gold-800/30 space-y-3">
        <BavlyTravelLogo variant="sidebar" className="w-full" />
        <div>
          <div className="text-lg font-bold text-gold-200 leading-tight">مركز KYC</div>
          <p className="text-[11px] text-gold-600 mt-1 leading-snug">إدارة الاعرف عميلك</p>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-5 overflow-y-auto">
        <div>
          <div className={sectionLabel}>عام</div>
          <div className="flex flex-col gap-0.5">
            <NavLink to="/" end className={linkClass}>
              لوحة التحكم
            </NavLink>
            <NavLink to="/kyc" className={linkClass}>
              سجلات KYC
            </NavLink>
            <NavLink to="/kyc/new" className={linkClass}>
              إضافة سجل
            </NavLink>
          </div>
        </div>

        {isAdmin && (
          <div>
            <div className={sectionLabel}>إدارة</div>
            <div className="flex flex-col gap-0.5">
              <NavLink to="/users" className={linkClass}>
                المستخدمون
              </NavLink>
              <NavLink to="/reports" className={linkClass}>
                التقارير والتحليلات
              </NavLink>
              <NavLink to="/audit" className={linkClass}>
                سجل النشاط
              </NavLink>
            </div>

          </div>
        )}
      </nav>

      <div className="p-3 border-t border-gold-800/30">
        <div className="glass-panel p-3 rounded-lg">
          <div className="text-xs font-semibold text-gold-200 truncate">{user?.full_name}</div>
          <div className="text-[11px] text-gold-500 font-mono truncate" dir="ltr" title={user?.username}>
            {user?.username}
          </div>
          <span
            className={cn(
              "inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border",
              isAdmin
                ? "border-gold-500/40 text-gold-400 bg-gold-900/20"
                : "border-gold-800 text-gold-500",
            )}
          >
            {isAdmin ? "مسؤول" : "موظف"}
          </span>
          <button
            type="button"
            className="btn-ghost w-full mt-3 text-xs py-2"
            onClick={() => void logout()}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>
  );
}
