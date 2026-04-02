import { apiFetch } from "@/services/api";
import type { AuditLogDto, PaginatedResponse } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function AuditPage() {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["audit", page],
    queryFn: () =>
      apiFetch<PaginatedResponse<AuditLogDto>>(
        `/audit-logs?page=${page}&page_size=50`,
      ),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gold-200">سجل التدقيق</h1>
      {q.isLoading && <div className="text-gold-400">جاري التحميل…</div>}
      {q.isError && <div className="text-red-400">تعذر التحميل</div>}
      <div className="glass-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gold-400 border-b border-gold-800/40">
            <tr>
              <th className="text-right px-3 py-2">الوقت</th>
              <th className="text-right px-3 py-2">الفعل</th>
              <th className="text-right px-3 py-2">المستخدم</th>
              <th className="text-right px-3 py-2">المورد</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.items.map((a) => (
              <tr key={a.id} className="border-b border-gold-900/30 align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString("ar-EG")}
                </td>
                <td className="px-3 py-2">{a.action}</td>
                <td className="px-3 py-2" dir="ltr">
                  {a.user_id ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-gold-500 max-w-md">
                  {a.resource_type} {a.resource_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {q.data && (
        <div className="flex justify-between text-sm text-gold-400">
          <button
            type="button"
            className="btn-ghost disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </button>
          <span>
            صفحة {page} — إجمالي {q.data.meta.total}
          </span>
          <button
            type="button"
            className="btn-ghost disabled:opacity-40"
            disabled={page * 50 >= q.data.meta.total}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
