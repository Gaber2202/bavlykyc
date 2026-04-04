import { SERVICE_BRANCHES } from "@/features/kyc/utils/kycFieldOptions";
import { apiFetch, formatApiErrorMessage } from "@/services/api";
import type {
  AdminUserRow,
  AnalyticsSummary,
  NamedCount,
  PaginatedResponse,
} from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GOLD = "#d4af37";
const GOLD_MUTED = "rgba(212, 175, 55, 0.35)";
const CHART_PALETTE = [
  "#d4af37",
  "#c99700",
  "#a67c00",
  "#7a5c00",
  "#5c4500",
  "#e8cf95",
  "#fef7e0",
  "#8b7355",
];

type TrendGranularity = "daily" | "weekly" | "monthly";

function useAnalyticsFilters() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("daily");

  const filterKey = [dateFrom, dateTo, employeeId, serviceType] as const;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (employeeId) p.set("employee_id", employeeId);
    if (serviceType) p.set("service_type", serviceType);
    return p.toString();
  }, [dateFrom, dateTo, employeeId, serviceType]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    employeeId,
    setEmployeeId,
    serviceType,
    setServiceType,
    trendGranularity,
    setTrendGranularity,
    filterKey,
    qs,
  };
}

export function ReportsPage() {
  const f = useAnalyticsFilters();

  const usersQ = useQuery({
    queryKey: ["users-analytics-dropdown"],
    queryFn: () =>
      apiFetch<PaginatedResponse<AdminUserRow>>(
        "/users?page=1&page_size=200&sort_by=full_name&sort_order=asc",
      ),
  });

  const q = useQuery({
    queryKey: ["analytics-summary", ...f.filterKey],
    queryFn: async () => {
      const path = `/analytics/summary${f.qs ? `?${f.qs}` : ""}`;
      return apiFetch<AnalyticsSummary>(path);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (q.isError) toast.error(formatApiErrorMessage(q.error));
  }, [q.isError, q.error]);

  const data = q.data;
  const isEmpty = data != null && data.kpi.total_submissions === 0;

  const trendData =
    data == null
      ? []
      : f.trendGranularity === "weekly"
        ? data.trend_weekly
        : f.trendGranularity === "monthly"
          ? data.trend_monthly
          : data.trend_daily;

  const ratioToChartData = (obj: Record<string, number>) =>
    Object.entries(obj).map(([name, pct]) => ({ name, value: pct }));

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gold-200 tracking-tight">تقارير وتحليلات</h1>
        <p className="text-sm text-gold-600">
          مؤشرات الأداء، الاتجاهات، والتوزيعات — مع فلاتر بالتاريخ والموظف ونوع الخدمة
        </p>
      </header>

      <div className="glass-panel p-5 space-y-4 border-gold-500/15">
        <div className="text-xs uppercase tracking-widest text-gold-600">عوامل التصفية</div>
        <div className="flex flex-wrap gap-3 items-end">
          <FilterField label="من تاريخ">
            <input
              type="date"
              className="input-field text-sm max-w-[170px]"
              value={f.dateFrom}
              onChange={(e) => f.setDateFrom(e.target.value)}
            />
          </FilterField>
          <FilterField label="إلى تاريخ">
            <input
              type="date"
              className="input-field text-sm max-w-[170px]"
              value={f.dateTo}
              onChange={(e) => f.setDateTo(e.target.value)}
            />
          </FilterField>
          <FilterField label="الموظف (منشئ السجل)">
            <select
              className="input-field text-sm min-w-[200px] max-w-[280px]"
              value={f.employeeId}
              onChange={(e) => f.setEmployeeId(e.target.value)}
            >
              <option value="">كل المستخدمين</option>
              {(usersQ.data?.items ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.username})
                  {u.role === "admin" ? " — مسؤول" : ""}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="فرع الخدمة">
            <select
              className="input-field text-sm max-w-[240px]"
              value={f.serviceType}
              onChange={(e) => f.setServiceType(e.target.value)}
            >
              <option value="">كل الفروع</option>
              {SERVICE_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="دقة مخطط الاتجاه">
            <select
              className="input-field text-sm max-w-[160px]"
              value={f.trendGranularity}
              onChange={(e) =>
                f.setTrendGranularity(e.target.value as TrendGranularity)
              }
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
            </select>
          </FilterField>
        </div>
      </div>

      {q.isLoading && <LoadingBlock />}

      {q.isError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-6 text-red-300 text-sm">
          تعذر تحميل التحليلات. تحقق من الاتصال أو الصلاحيات.
        </div>
      )}

      {data && isEmpty && (
        <div className="rounded-xl border border-dashed border-gold-800/60 bg-ink/40 px-6 py-14 text-center text-gold-500">
          لا توجد سجلات مطابقة للفلاتر الحالية. جرّب توسيع نطاق التاريخ أو إلغاء التصفية.
        </div>
      )}

      {data && !isEmpty && (
        <>
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi
              title="إجمالي السجلات (ضمن الفلتر)"
              value={data.kpi.total_submissions}
              accent
            />
            <Kpi title="اليوم" value={data.kpi.submissions_today} />
            <Kpi title="هذا الأسبوع" value={data.kpi.submissions_this_week} />
            <Kpi title="هذا الشهر" value={data.kpi.submissions_this_month} />
            <Kpi title="موظفون نشطون (النظام)" value={data.kpi.active_employees} />
            <Kpi
              title="متوسط العمر"
              value={data.kpi.average_age != null ? data.kpi.average_age.toFixed(1) : "—"}
            />
            <Kpi
              title="نسبة مرفوض (حالة)"
              value={
                data.kpi.rejection_rate != null ? `${data.kpi.rejection_rate.toFixed(1)}٪` : "—"
              }
            />
            <Kpi
              title="سابق رفض تأشيرات"
              value={
                data.kpi.prior_refusal_rate != null
                  ? `${data.kpi.prior_refusal_rate.toFixed(1)}٪`
                  : "—"
              }
            />
          </section>

          <div className="grid xl:grid-cols-3 gap-6">
            <ChartCard title={`الاتجاه — ${f.trendGranularity === "daily" ? "يومي" : f.trendGranularity === "weekly" ? "أسبوعي" : "شهري"}`}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 8, left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GOLD_MUTED} />
                  <XAxis dataKey="period" stroke="#a67c00" tick={{ fill: "#e8cf95", fontSize: 11 }} />
                  <YAxis stroke="#a67c00" tick={{ fill: "#e8cf95", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: `1px solid ${GOLD}`,
                      borderRadius: 8,
                      direction: "rtl",
                    }}
                    labelStyle={{ color: "#f5e6c8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="السجلات"
                    stroke={GOLD}
                    strokeWidth={2}
                    dot={{ fill: GOLD, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="حسب نوع الخدمة">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.by_service_type} margin={{ top: 8, left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GOLD_MUTED} />
                  <XAxis dataKey="name" stroke="#a67c00" tick={{ fill: "#e8cf95", fontSize: 11 }} />
                  <YAxis stroke="#a67c00" tick={{ fill: "#e8cf95", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0a0a0a", border: `1px solid ${GOLD}` }}
                  />
                  <Bar dataKey="count" name="العدد" fill={GOLD} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="حسب الحالة (دونات)">
              <DoughnutChart data={data.by_status} />
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="تأشيرات سابقة — نسب (٪)">
              <DoughnutSmall data={ratioToChartData(data.previous_visa_ratio)} />
            </ChartCard>
            <ChartCard title="قمع التحويل — حسب الحالة">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.funnel_by_status} layout="vertical" margin={{ left: 16, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GOLD_MUTED} />
                  <XAxis type="number" stroke="#a67c00" tick={{ fill: "#e8cf95" }} />
                  <YAxis type="category" dataKey="status" stroke="#a67c00" tick={{ fill: "#e8cf95" }} width={100} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: `1px solid ${GOLD}` }} />
                  <Bar dataKey="count" fill={GOLD} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="نوع الجنسية">
              <DoughnutChart data={data.nationality_split} />
            </ChartCard>
            <ChartCard title="الحالة الاجتماعية">
              <DoughnutChart data={data.marital_split} />
            </ChartCard>
          </div>

          <section className="glass-panel p-5 border-gold-500/15">
            <h2 className="text-gold-300 font-semibold mb-4">أكثر الموظفين إنشاءً للسجلات</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gold-800/50 text-gold-500 text-right">
                    <th className="py-2 px-3 font-medium">#</th>
                    <th className="py-2 px-3 font-medium">اسم الموظف</th>
                    <th className="py-2 px-3 font-medium">عدد السجلات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_employees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gold-600">
                        لا بيانات
                      </td>
                    </tr>
                  ) : (
                    data.top_employees.map((row, i) => (
                      <tr key={`${row.name}-${i}`} className="border-b border-gold-900/30">
                        <td className="py-2.5 px-3 text-gold-600">{i + 1}</td>
                        <td className="py-2.5 px-3 text-gold-100">{row.name}</td>
                        <td className="py-2.5 px-3 text-gold-200 font-semibold tabular-nums">
                          {row.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-gold-500">
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}

function LoadingBlock() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-gold-900/15 border border-gold-800/30" />
      ))}
    </div>
  );
}

function Kpi({
  title,
  value,
  accent,
}: {
  title: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        accent
          ? "border-gold-500/40 bg-gradient-to-br from-gold-900/25 to-ink"
          : "border-gold-800/40 bg-ink/60"
      }`}
    >
      <div className="text-xs text-gold-500 leading-snug">{title}</div>
      <div className="text-2xl font-bold text-gold-200 mt-1.5 tabular-nums">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-4 border-gold-500/12">
      <div className="text-gold-300 font-medium mb-3 text-sm">{title}</div>
      {children}
    </div>
  );
}

function DoughnutChart({ data }: { data: NamedCount[] }) {
  if (!data.length) {
    return <EmptyChart />;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data as { name: string; count: number }[]}
          dataKey="count"
          nameKey="name"
          innerRadius={58}
          outerRadius={95}
          paddingAngle={2}
          stroke="#0a0a0a"
          strokeWidth={1}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: `1px solid ${GOLD}` }}
        />
        <Legend
          wrapperStyle={{ direction: "rtl" }}
          formatter={(value) => <span className="text-gold-200 text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DoughnutSmall({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) {
    return <EmptyChart />;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}٪`, "نسبة"]}
          contentStyle={{ background: "#0a0a0a", border: `1px solid ${GOLD}` }}
        />
        <Legend wrapperStyle={{ direction: "rtl" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="h-[280px] flex items-center justify-center text-gold-600 text-sm border border-dashed border-gold-900/50 rounded-lg">
      لا بيانات للعرض
    </div>
  );
}
