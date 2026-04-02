import { Sidebar } from "@/features/shell/Sidebar";
import { Outlet } from "react-router-dom";

/** Auth-aware shell: sidebar reflects role; main area renders feature routes. */
export function DashboardLayout() {
  return (
    <div className="min-h-screen flex text-gold-100">
      <Sidebar />
      <main
        className="flex-1 min-h-screen overflow-auto p-6 md:p-8 bg-gradient-to-br from-ink via-ink to-[#120f08]"
        id="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
}
