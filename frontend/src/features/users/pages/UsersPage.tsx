import { apiFetch, formatApiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import type {
  AdminPasswordResetResponse,
  AdminUserRow,
  PaginatedResponse,
  UserActivitySummaryDto,
  UserRole,
} from "@/types/api";
import clsx from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type SortKey =
  | "created_at"
  | "username"
  | "full_name"
  | "role"
  | "is_active"
  | "last_login_at";

export function UsersPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const listQuery = useQuery({
    queryKey: [
      "users",
      page,
      search,
      roleFilter,
      activeFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: () => {
      const q = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search.trim()) q.set("search", search.trim());
      if (roleFilter) q.set("role", roleFilter);
      if (activeFilter === "true") q.set("is_active", "true");
      if (activeFilter === "false") q.set("is_active", "false");
      return apiFetch<PaginatedResponse<AdminUserRow>>(`/users?${q}`);
    },
  });

  const toggleSort = useCallback(
    (col: SortKey) => {
      if (sortBy === col) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(col);
        setSortOrder("desc");
      }
      setPage(1);
    },
    [sortBy],
  );

  const toggleActive = useMutation({
    mutationFn: async (vars: { id: string; makeActive: boolean }) => {
      const path = vars.makeActive ? "activate" : "deactivate";
      return apiFetch<AdminUserRow>(`/users/${vars.id}/${path}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم تحديث حالة الحساب");
    },
    onError: (e) => toast.error(formatApiErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gold-200">إدارة المستخدمين</h1>
          <p className="text-sm text-gold-600 mt-1">
            مسؤول فقط — جميع الإجراءات تُسجَّل في سجل التدقيق
          </p>
        </div>
        <CreateUserDialog onCreated={() => void qc.invalidateQueries({ queryKey: ["users"] })} />
      </div>

      <div className="glass-panel p-5 space-y-3 border-gold-500/15">
        <div className="text-xs uppercase tracking-widest text-gold-600">بحث وتصفية</div>
        <div className="flex flex-wrap gap-3">
          <input
            className="input-field max-w-xs text-sm"
            placeholder="بحث بالاسم أو اسم الدخول…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="input-field max-w-[160px] text-sm"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as "" | UserRole);
              setPage(1);
            }}
          >
            <option value="">كل الأدوار</option>
            <option value="admin">مسؤول</option>
            <option value="employee">موظف</option>
          </select>
          <select
            className="input-field max-w-[160px] text-sm"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as "" | "true" | "false");
              setPage(1);
            }}
          >
            <option value="">الكل</option>
            <option value="true">نشط</option>
            <option value="false">معطّل</option>
          </select>
        </div>
      </div>

      {listQuery.isLoading && (
        <div className="text-gold-500 py-12 text-center rounded-xl border border-gold-800/40">
          جاري التحميل…
        </div>
      )}
      {listQuery.isError && (
        <div className="text-red-400 py-6">{formatApiErrorMessage(listQuery.error)}</div>
      )}

      {listQuery.data && listQuery.data.items.length === 0 && (
        <div className="text-gold-600 py-12 text-center border border-dashed border-gold-800/50 rounded-xl">
          لا مستخدمين مطابقين
        </div>
      )}

      {listQuery.data && listQuery.data.items.length > 0 && (
        <div className="glass-panel overflow-x-auto border-gold-500/12">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gold-800/50 text-gold-500 bg-ink/50">
                {(
                  [
                    ["username", "اسم الدخول"],
                    ["full_name", "الاسم الكامل"],
                    ["role", "الدور"],
                    ["is_active", "الحالة"],
                    ["last_login_at", "آخر دخول"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="text-right px-3 py-3 font-semibold whitespace-nowrap">
                    <button
                      type="button"
                      className={clsx(
                        "hover:text-gold-200 transition",
                        sortBy === key && "text-gold-200",
                      )}
                      onClick={() => toggleSort(key as SortKey)}
                    >
                      {label}
                      {sortBy === key ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">
                  تغيير المرور
                </th>
                <th className="text-right px-3 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gold-900/35 hover:bg-gold-900/10 transition-colors"
                >
                  <td className="px-3 py-2.5 text-gold-100 font-mono text-xs dir-ltr text-right">
                    {u.username}
                  </td>
                  <td className="px-3 py-2.5 text-gold-100">{u.full_name}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs border",
                        u.role === "admin"
                          ? "border-gold-500/50 text-gold-300 bg-gold-900/20"
                          : "border-gold-800 text-gold-400",
                      )}
                    >
                      {u.role === "admin" ? "مسؤول" : "موظف"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {u.is_active ? (
                      <span className="text-emerald-400 text-xs">نشط</span>
                    ) : (
                      <span className="text-red-400/90 text-xs">معطّل</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gold-400 text-xs whitespace-nowrap">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString("ar-EG")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {u.must_change_password ? (
                      <span className="text-amber-400">مطلوب</span>
                    ) : (
                      <span className="text-gold-600">لا</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <UserRowActions
                      user={u}
                      currentUserId={currentUser?.id}
                      onToggleActive={(id, makeActive) => {
                        const label = makeActive
                          ? "تفعيل هذا الحساب؟"
                          : "تعطيل هذا الحساب؟ لن يتمكن من تسجيل الدخول.";
                        if (!window.confirm(label)) return;
                        toggleActive.mutate({ id, makeActive });
                      }}
                      onUpdated={() => void qc.invalidateQueries({ queryKey: ["users"] })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {listQuery.data && listQuery.data.meta.total > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-gold-500">
          <button
            type="button"
            className="btn-ghost text-xs disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </button>
          <span>
            صفحة {page} — إجمالي {listQuery.data.meta.total}
          </span>
          <button
            type="button"
            className="btn-ghost text-xs disabled:opacity-40"
            disabled={page * pageSize >= listQuery.data.meta.total}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

function UserRowActions({
  user,
  currentUserId,
  onToggleActive,
  onUpdated,
}: {
  user: AdminUserRow;
  currentUserId: string | undefined;
  onToggleActive: (id: string, makeActive: boolean) => void;
  onUpdated: () => void;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      <button
        type="button"
        className="btn-ghost text-[11px] py-1 px-2"
        onClick={() => setActivityOpen(true)}
      >
        النشاط
      </button>
      <button
        type="button"
        className="btn-ghost text-[11px] py-1 px-2"
        onClick={() => setEditOpen(true)}
      >
        تعديل
      </button>
      <button
        type="button"
        className="btn-ghost text-[11px] py-1 px-2"
        onClick={() => setResetOpen(true)}
      >
        كلمة المرور
      </button>
      <button
        type="button"
        className={clsx(
          "text-[11px] py-1 px-2 rounded-lg border transition",
          user.is_active
            ? "border-red-800/60 text-red-300 hover:bg-red-950/30"
            : "border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/20",
        )}
        disabled={user.id === currentUserId && user.is_active}
        title={user.id === currentUserId ? "لا يمكنك تعطيل حسابك الحالي" : undefined}
        onClick={() => onToggleActive(user.id, !user.is_active)}
      >
        {user.is_active ? "تعطيل" : "تفعيل"}
      </button>

      {activityOpen && (
        <ActivityModal userId={user.id} onClose={() => setActivityOpen(false)} />
      )}
      {editOpen && (
        <EditUserDialog user={user} onClose={() => setEditOpen(false)} onSaved={onUpdated} />
      )}
      {resetOpen && (
        <ResetPasswordDialog user={user} onClose={() => setResetOpen(false)} onSaved={onUpdated} />
      )}
    </div>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          username,
          full_name: fullName,
          password,
          role,
        }),
      });
      toast.success("تم إنشاء المستخدم");
      setOpen(false);
      setUsername("");
      setFullName("");
      setPassword("");
      onCreated();
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary text-sm px-5" onClick={() => setOpen(true)}>
        + مستخدم جديد
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="glass-panel max-w-md w-full p-6 space-y-4 border-gold-500/25 shadow-2xl"
        role="dialog"
        aria-modal
      >
        <h2 className="text-lg font-semibold text-gold-200">مستخدم جديد</h2>
        <input
          className="input-field"
          placeholder="اسم الدخول"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="الاسم الكامل"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="password"
          className="input-field"
          placeholder="كلمة المرور (8 أحرف على الأقل)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select
          className="input-field"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          <option value="employee">موظف</option>
          <option value="admin">مسؤول</option>
        </select>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(false)}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading}
            onClick={() => void submit()}
          >
            إنشاء
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [newUsername, setNewUsername] = useState(user.username);
  const [loading, setLoading] = useState(false);

  async function saveProfile() {
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, role }),
      });
      if (newUsername.trim() !== user.username) {
        await apiFetch(`/users/${user.id}/username`, {
          method: "PATCH",
          body: JSON.stringify({ username: newUsername.trim() }),
        });
      }
      toast.success("تم حفظ التعديلات");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="glass-panel max-w-md w-full p-6 space-y-4 border-gold-500/25"
        role="dialog"
        aria-modal
      >
        <h2 className="text-lg font-semibold text-gold-200">تعديل مستخدم</h2>
        <label className="block text-xs text-gold-500">
          اسم الدخول
          <input
            className="input-field mt-1 text-sm"
            dir="ltr"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </label>
        <label className="block text-xs text-gold-500">
          الاسم الكامل
          <input
            className="input-field mt-1 text-sm"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <label className="block text-xs text-gold-500">
          الدور
          <select
            className="input-field mt-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="employee">موظف</option>
            <option value="admin">مسؤول</option>
          </select>
        </label>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost text-sm" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading}
            onClick={() => void saveProfile()}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"generate" | "manual">("generate");
  const [manualPw, setManualPw] = useState("");
  const [result, setResult] = useState<AdminPasswordResetResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const body =
        mode === "manual" && manualPw.trim().length >= 8
          ? { new_password: manualPw.trim() }
          : { new_password: null };
      const res = await apiFetch<AdminPasswordResetResponse>(
        `/users/${user.id}/reset-password`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setResult(res);
      toast.success(res.message);
      onSaved();
      if (res.temporary_password) {
        try {
          await navigator.clipboard.writeText(res.temporary_password);
          toast.info("تم نسخ كلمة المرور المؤقتة إلى الحافظة");
        } catch {
          /* clipboard API unavailable */
        }
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="glass-panel max-w-md w-full p-6 space-y-4 border-gold-500/25"
        role="dialog"
        aria-modal
      >
        <h2 className="text-lg font-semibold text-gold-200">إعادة تعيين كلمة المرور</h2>
        <p className="text-xs text-gold-500 leading-relaxed">
          المستخدم: <strong className="text-gold-300">{user.full_name}</strong> — سيُطلب منه تغيير
          كلمة المرور عند أول دخول. جلساته الحالية تُلغى.
        </p>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-gold-300">
            <input
              type="radio"
              name="mode"
              checked={mode === "generate"}
              onChange={() => setMode("generate")}
            />
            توليد كلمة مرور مؤقتة تلقائياً (تُعرض مرة واحدة هنا)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gold-300">
            <input
              type="radio"
              name="mode"
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
            />
            تعيين يدوي (8 أحرف على الأقل)
          </label>
        </div>
        {mode === "manual" && (
          <input
            type="password"
            className="input-field text-sm"
            placeholder="كلمة المرور الجديدة"
            value={manualPw}
            onChange={(e) => setManualPw(e.target.value)}
          />
        )}
        {result?.temporary_password && (
          <div className="rounded-lg border border-amber-700/40 bg-amber-950/25 px-3 py-2 text-sm">
            <div className="text-amber-200/90 text-xs mb-1">كلمة المرور المؤقتة (انسخها فوراً)</div>
            <code className="text-amber-100 break-all dir-ltr block text-left">
              {result.temporary_password}
            </code>
          </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost text-sm" onClick={onClose}>
            إغلاق
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading || (mode === "manual" && manualPw.length < 8)}
            onClick={() => void submit()}
          >
            {loading ? "جارٍ التنفيذ…" : "تنفيذ"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["user-activity", userId],
    queryFn: () => apiFetch<UserActivitySummaryDto>(`/users/${userId}/activity`),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="glass-panel max-w-md w-full p-6 space-y-4 border-gold-500/25"
        role="dialog"
        aria-modal
      >
        <h2 className="text-lg font-semibold text-gold-200">ملخص النشاط</h2>
        {q.isLoading && <div className="text-gold-500 text-sm">جاري التحميل…</div>}
        {q.isError && (
          <div className="text-red-400 text-sm">{formatApiErrorMessage(q.error)}</div>
        )}
        {q.data && (
          <ul className="space-y-2 text-sm text-gold-200">
            <li>
              آخر دخول:{" "}
              {q.data.last_login_at
                ? new Date(q.data.last_login_at).toLocaleString("ar-EG")
                : "—"}
            </li>
            <li>أحداث التدقيق (30 يوماً): {q.data.audit_events_last_30_days}</li>
            <li>سجلات KYC منشأة (غير محذوفة): {q.data.kyc_created_count}</li>
          </ul>
        )}
        <button type="button" className="btn-ghost text-sm w-full" onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
