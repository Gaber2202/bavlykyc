import { useAuthStore } from "@/stores/authStore";
import { DashboardLayout } from "@/features/shell/DashboardLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { KycListPage } from "@/features/kyc/pages/KycListPage";
import { KycCreatePage } from "@/features/kyc/pages/KycCreatePage";
import { KycDetailPage } from "@/features/kyc/pages/KycDetailPage";
import { KycEditPage } from "@/features/kyc/pages/KycEditPage";
import { UsersPage } from "@/features/users/pages/UsersPage";
import { ReportsPage } from "@/features/reports/pages/ReportsPage";
import { AuditPage } from "@/features/audit/pages/AuditPage";
import { NotFoundPage } from "@/app/NotFoundPage";
import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

function Protected() {
  const { user, hydrated } = useAuthStore();
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gold-300">
        جاري التحميل…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RequirePasswordNotForced() {
  const user = useAuthStore((s) => s.user);
  const loc = useLocation();
  if (user?.must_change_password && !loc.pathname.endsWith("/change-password")) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

function AdminOnly() {
  const { user } = useAuthStore();
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function AppRouter() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route element={<RequirePasswordNotForced />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="kyc" element={<KycListPage />} />
            <Route path="kyc/new" element={<KycCreatePage />} />
            <Route path="kyc/:id" element={<KycDetailPage />} />
            <Route path="kyc/:id/edit" element={<KycEditPage />} />
            <Route element={<AdminOnly />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="analytics" element={<Navigate to="/reports" replace />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
