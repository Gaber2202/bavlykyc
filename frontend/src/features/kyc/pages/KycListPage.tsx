import { fetchAllKycForExport, downloadKycExcel } from "@/features/kyc/utils/kycExcelExport";
import {
  buildKycListQueryParams,
  isKycListSortField,
  type KycListSortField,
} from "@/features/kyc/utils/kycListQuery";
import { apiFetch, formatApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import type { AdminUserRow, KYCRecordDto, PaginatedResponse } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const col = createColumnHelper<KYCRecordDto>();

export function KycListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [status, setStatus] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<KycListSortField>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users-kyc-filter"],
    queryFn: () =>
      apiFetch<PaginatedResponse<AdminUserRow>>(
        "/users?page=1&page_size=200&sort_by=full_name&sort_order=asc",
      ),
    enabled: isAdmin,
  });

  const query = useQuery({
    queryKey: [
      "kyc",
      page,
      search,
      clientName,
      phone,
      serviceType,
      status,
      createdById,
      dateFrom,
      dateTo,
      includeDeleted,
      sortBy,
      sortOrder,
    ],
    queryFn: () => {
      const q = buildKycListQueryParams(
        {
          search,
          clientName,
          phone,
          serviceType,
          status,
          createdById,
          dateFrom,
          dateTo,
          includeDeleted,
          sortBy,
          sortOrder,
          isAdmin,
        },
        page,
        pageSize,
      );
      return apiFetch<PaginatedResponse<KYCRecordDto>>(`/kyc?${q.toString()}`);
    },
  });

  useEffect(() => {
    if (query.isError) {
      toast.error(formatApiErrorMessage(query.error));
    }
  }, [query.isError, query.error]);

  async function handleExportExcel() {
    const total = query.data?.meta.total ?? 0;
    if (total === 0) {
      toast.error("لا توجد سجلات للتصدير");
      return;
    }
    setExporting(true);
    try {
      const rows = await fetchAllKycForExport(apiFetch, {
        search,
        clientName,
        phone,
        serviceType,
        status,
        createdById,
        dateFrom,
        dateTo,
        includeDeleted,
        sortBy,
        sortOrder,
        isAdmin,
      });
      await downloadKycExcel(rows);
      toast.success(`تم تصدير ${rows.length} سجلًا إلى Excel`);
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(field: KycListSortField) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }

  const columns = useMemo(
    () => [
      col.accessor("client_full_name", { header: "العميل" }),
      col.accessor("phone_number", { header: "الهاتف" }),
      col.accessor("service_type", { header: "الخدمة" }),
      col.accessor("status", { header: "الحالة" }),
      col.accessor("assigned_to", { header: "المكلف" }),
      col.accessor("employee_name", { header: "الموظف" }),
      col.accessor("created_at", {
        header: "التاريخ",
        cell: (c) => new Date(c.getValue()).toLocaleDateString("ar-EG"),
      }),
      col.display({
        id: "actions",
        header: "",
        cell: (ctx) => (
          <div className="flex gap-2 justify-end">
            <Link
              className="text-gold-300 underline text-sm whitespace-nowrap"
              to={`/kyc/${ctx.row.original.id}`}
            >
              تفاصيل
            </Link>
            <Link
              className="text-gold-400 underline text-sm whitespace-nowrap"
              to={`/kyc/${ctx.row.original.id}/edit`}
            >
              تعديل
            </Link>
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: query.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gold-200 tracking-tight">سجلات KYC</h1>
          <p className="text-sm text-gold-500 mt-1">إدارة الاعرف عميلك — واجهة عربية كاملة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost text-sm border border-gold-700/50"
            disabled={
              exporting ||
              query.isLoading ||
              query.isFetching ||
              (query.data?.meta.total ?? 0) === 0
            }
            onClick={() => void handleExportExcel()}
          >
            {exporting ? "جاري التصدير…" : "تصدير Excel"}
          </button>
          <Link to="/kyc/new" className="btn-primary text-sm shadow-lg shadow-gold-900/30">
            + إضافة سجل
          </Link>
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4 border-gold-500/20">
        <div className="text-xs uppercase tracking-widest text-gold-600">التصفية</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FilterInput
            label="بحث عام"
            placeholder="عميل، هاتف، بريد…"
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <FilterInput
            label="اسم العميل"
            placeholder="تطابق جزئي"
            value={clientName}
            onChange={(v) => {
              setClientName(v);
              setPage(1);
            }}
          />
          <FilterInput
            label="رقم الهاتف"
            placeholder="تطابق جزئي"
            value={phone}
            onChange={(v) => {
              setPhone(v);
              setPage(1);
            }}
            dir="ltr"
          />
          <label className="block text-xs text-gold-500">
            <span className="block mb-1">نوع الخدمة</span>
            <select
              className="input-field text-sm"
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الخدمات</option>
              <option value="بافلي">بافلي</option>
              <option value="ترانس روفر">ترانس روفر</option>
              <option value="أخرى">أخرى</option>
            </select>
          </label>
          <label className="block text-xs text-gold-500">
            <span className="block mb-1">الحالة</span>
            <select
              className="input-field text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">كل الحالات</option>
              <option value="مسودة">مسودة</option>
              <option value="قيد المراجعة">قيد المراجعة</option>
              <option value="موافق">موافق</option>
              <option value="مرفوض">مرفوض</option>
              <option value="مكتمل">مكتمل</option>
            </select>
          </label>
          {isAdmin && (
            <label className="block text-xs text-gold-500">
              <span className="block mb-1">أنشأه</span>
              <select
                className="input-field text-sm"
                value={createdById}
                onChange={(e) => {
                  setCreatedById(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">كل المستخدمين</option>
                {(usersQuery.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.username})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs text-gold-500">
            <span className="block mb-1">من تاريخ</span>
            <input
              type="date"
              className="input-field text-sm"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="block text-xs text-gold-500">
            <span className="block mb-1">إلى تاريخ</span>
            <input
              type="date"
              className="input-field text-sm"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        {isAdmin && (
          <label className="inline-flex items-center gap-2 text-sm text-gold-400 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-gold-600 bg-ink text-gold-500 focus:ring-gold-500"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(1);
              }}
            />
            عرض المحذوفة (مسؤول)
          </label>
        )}
      </div>

      {query.isLoading && (
        <div className="text-gold-400 py-12 text-center border border-gold-800/30 rounded-xl bg-ink-50/50">
          جاري التحميل…
        </div>
      )}
      {!query.isLoading && query.data?.items.length === 0 && (
        <div className="text-gold-500 py-12 text-center border border-dashed border-gold-800/40 rounded-xl">
          لا توجد سجلات مطابقة
        </div>
      )}

      {!query.isLoading && (query.data?.items.length ?? 0) > 0 && (
        <div className="glass-panel overflow-x-auto border-gold-500/15">
          <table className="min-w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-gold-800/50 text-gold-400 bg-ink/40">
                  {hg.headers.map((h) => {
                    const colId = h.column.id;
                    const s = isKycListSortField(colId) ? colId : null;
                    return (
                      <th key={h.id} className="text-right px-3 py-3 font-semibold">
                        {s ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-gold-300 hover:text-gold-100 transition"
                            onClick={() => toggleSort(s)}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sortBy === s ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gold-900/35 hover:bg-gold-900/10 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 text-gold-100/95">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.data && query.data.meta.total > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-gold-400">
          <button
            type="button"
            className="btn-ghost disabled:opacity-40 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </button>
          <span>
            صفحة {page} من {Math.max(1, Math.ceil(query.data.meta.total / pageSize))} — إجمالي{" "}
            {query.data.meta.total}
          </span>
          <button
            type="button"
            className="btn-ghost disabled:opacity-40 text-xs"
            disabled={page * pageSize >= query.data.meta.total}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
  dir,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr";
}) {
  return (
    <label className="block text-xs text-gold-500">
      <span className="block mb-1">{label}</span>
      <input
        className="input-field text-sm"
        placeholder={placeholder}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
