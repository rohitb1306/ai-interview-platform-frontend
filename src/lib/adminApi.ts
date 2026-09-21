import type {
  AdminApplication,
  AdminApplicationDetail,
  AdminJob,
  AdminJobInput,
  AdminSessionReport,
  AdminStats,
  ApplicationStatus,
  LoginResponse,
  StaffUser,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ADMIN_BASE = `${API_BASE}/admin`;

const ACCESS_KEY = "admin_access";
const REFRESH_KEY = "admin_refresh";

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function hasAdminSession(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(REFRESH_KEY);
}

export function clearAdminSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string") return b.detail;
    // DRF field errors: { field: ["msg"] }
    const first = Object.entries(b)[0];
    if (first && Array.isArray(first[1])) return `${first[0]}: ${first[1][0]}`;
  }
  return `Request failed with status ${status}`;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  const res = await fetch(`${ADMIN_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const body = await res.json();
  localStorage.setItem(ACCESS_KEY, body.access);
  return true;
}

async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const access = localStorage.getItem(ACCESS_KEY);
  const res = await fetch(`${ADMIN_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && retry) {
    if (await refreshAccessToken()) return adminFetch<T>(path, init, false);
    clearAdminSession();
    window.location.assign("/admin/login");
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AdminApiError(errorMessage(body, res.status), res.status);
  return body as T;
}

export async function adminLogin(
  username: string,
  password: string
): Promise<StaffUser> {
  const res = await fetch(`${ADMIN_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AdminApiError(errorMessage(body, res.status), res.status);
  const data = body as LoginResponse;
  localStorage.setItem(ACCESS_KEY, data.access);
  localStorage.setItem(REFRESH_KEY, data.refresh);
  return data.user;
}

export const getMe = () => adminFetch<StaffUser>("/auth/me");

export const getStats = () => adminFetch<AdminStats>("/stats");

export const listAdminJobs = () => adminFetch<AdminJob[]>("/jobs/");

export const getAdminJob = (id: string) => adminFetch<AdminJob>(`/jobs/${id}/`);

export const createJob = (input: AdminJobInput) =>
  adminFetch<AdminJob>("/jobs/", { method: "POST", body: JSON.stringify(input) });

export const updateJob = (id: string, input: AdminJobInput) =>
  adminFetch<AdminJob>(`/jobs/${id}/`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const deleteJob = (id: string) =>
  adminFetch<void>(`/jobs/${id}/`, { method: "DELETE" });

export function listApplications(filters: {
  job?: string;
  status?: ApplicationStatus | "";
  q?: string;
}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
  const qs = params.toString();
  return adminFetch<AdminApplication[]>(`/applications/${qs ? `?${qs}` : ""}`);
}

export const getApplication = (id: string) =>
  adminFetch<AdminApplicationDetail>(`/applications/${id}/`);

export const applicationAction = (
  id: string,
  action: "shortlist" | "reject" | "rescreen"
) =>
  adminFetch<AdminApplicationDetail>(`/applications/${id}/${action}/`, {
    method: "POST",
  });

export const getSessionReport = (sessionId: string) =>
  adminFetch<AdminSessionReport>(`/sessions/${sessionId}/`);
