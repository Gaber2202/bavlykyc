import type { MeResponse, TokenPair } from "@/types/api";

/** Same-origin `/api/v1` on Vercel (proxied to FastAPI); localhost in dev. */
const rawBase = import.meta.env.VITE_API_BASE_URL?.trim();
const base = rawBase
  ? rawBase.replace(/\/$/, "")
  : import.meta.env.DEV
    ? "http://localhost:8000/api/v1"
    : "/api/v1";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(pair: TokenPair | null) {
  if (!pair) {
    accessToken = null;
    refreshToken = null;
    return;
  }
  accessToken = pair.access_token;
  refreshToken = pair.refresh_token;
}

export function getAccessToken() {
  return accessToken;
}

export function loadTokensFromStorage() {
  const raw = localStorage.getItem("kyc_auth");
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as TokenPair;
    setTokens(p);
  } catch {
    localStorage.removeItem("kyc_auth");
  }
}

export function persistTokens(pair: TokenPair | null) {
  if (!pair) {
    localStorage.removeItem("kyc_auth");
    setTokens(null);
    return;
  }
  localStorage.setItem("kyc_auth", JSON.stringify(pair));
  setTokens(pair);
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        persistTokens(null);
        return false;
      }
      const pair = (await res.json()) as TokenPair;
      persistTokens(pair);
      return true;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  let res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 401 && refreshToken) {
    const ok = await refreshSession();
    if (ok) {
      const h2 = new Headers(init.headers);
      if (!h2.has("Content-Type") && init.body) {
        h2.set("Content-Type", "application/json");
      }
      h2.set("Authorization", `Bearer ${accessToken}`);
      res = await fetch(`${base}${path}`, { ...init, headers: h2 });
    }
  }
  if (!res.ok) {
    let detail: unknown = await res.text();
    try {
      detail = JSON.parse(detail as string);
    } catch {
      /* keep text */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function detailToString(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) return body;
  if (!body || typeof body !== "object") return `خطأ ${status}`;
  const errList = (body as { errors?: unknown }).errors;
  if (Array.isArray(errList) && errList.length) {
    const parts = errList.map((item) => {
      if (typeof item === "object" && item && "message" in item) {
        const field =
          "field" in item && typeof (item as { field: unknown }).field === "string"
            ? `${(item as { field: string }).field}: `
            : "";
        return `${field}${String((item as { message: string }).message)}`;
      }
      return JSON.stringify(item);
    });
    if (parts.length) return parts.join("؛ ");
  }
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "object" && item && "msg" in item) {
        const loc = "loc" in item && Array.isArray((item as { loc: unknown }).loc)
          ? (item as { loc: string[] }).loc.join(".")
          : "";
        const msg = String((item as { msg: string }).msg);
        return loc ? `${loc}: ${msg}` : msg;
      }
      return JSON.stringify(item);
    });
    if (parts.length) return parts.join("؛ ");
  }
  return `خطأ ${status}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(detailToString(body, status));
  }
}

/** Human-readable message for toasts (FastAPI `detail` string, list, or validation errors). */
export function formatApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return detailToString(err.body, err.status);
  }
  // Chrome/Edge/Safari: network failure, CORS block, mixed content (https page → http API), DNS, API down
  if (
    err instanceof TypeError &&
    (err.message === "Failed to fetch" || err.message === "Load failed")
  ) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[KYC API] فشل الطلب. العنوان المستخدم:", base);
    }
    return [
      "تعذر الاتصال بالخادم (الشبكة أو سياسة المتصفح).",
      "• أعد بناء الواجهة بعد تعديل VITE_API_BASE_URL (يُثبت وقت البناء فقط).",
      "• إن فتحت الموقع بـ https والـ API بـ http يمنع المتصفح الطلب (محتوى مختلط) — استخدم نفس البروتوكول أو TLS للـ API.",
      "• في الخادم: CORS_ORIGINS يجب أن يتضمن أصل الصفحة بالضبط (مثال: http://187.127.142.186 بدون شرطة مائلة في النهاية).",
      `• العنوان الحالي للـ API في هذه البنية: ${base}`,
    ].join(" ");
  }
  if (err instanceof Error) return err.message;
  return "حدث خطأ غير متوقع";
}

export async function loginRequest(username: string, password: string) {
  return apiFetch<TokenPair>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function meRequest() {
  return apiFetch<MeResponse>("/auth/me");
}

export async function logoutRequest(refresh?: string | null) {
  await apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refresh ?? refreshToken }),
  });
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
) {
  return apiFetch<TokenPair>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
