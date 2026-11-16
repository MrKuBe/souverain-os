import { cache } from "react";
import { cookies } from "next/headers";

import type {
  Application,
  Audit,
  AuditListItem,
  AuditLogPage,
  Dashboard,
  User,
} from "./types";

const SERVER_API_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

export class ServerApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
  }
}

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function serverRequest<T>(path: string): Promise<T> {
  const cookie = await cookieHeader();
  const response = await fetch(`${SERVER_API_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Le corps d'erreur n'est pas toujours du JSON.
    }
    throw new ServerApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    return await serverRequest<User>("/api/auth/me");
  } catch {
    return null;
  }
});

export const getAudits = cache(async (): Promise<AuditListItem[]> => {
  return serverRequest<AuditListItem[]>("/api/audits");
});

export const getAudit = cache(async (auditId: number): Promise<Audit> => {
  return serverRequest<Audit>(`/api/audits/${auditId}`);
});

export const getDashboard = cache(async (auditId: number): Promise<Dashboard> => {
  return serverRequest<Dashboard>(`/api/audits/${auditId}/dashboard`);
});

export const getApplications = cache(async (auditId: number): Promise<Application[]> => {
  return serverRequest<Application[]>(`/api/audits/${auditId}/applications`);
});

export const getAdminUsers = cache(async (): Promise<User[]> => {
  return serverRequest<User[]>("/api/admin/users");
});

export const getAuditLogs = cache(
  async (params: {
    limit: number;
    offset: number;
    action?: string;
    username?: string;
  }): Promise<AuditLogPage> => {
    const query = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    if (params.action) query.set("action", params.action);
    if (params.username) query.set("username", params.username);
    return serverRequest<AuditLogPage>(`/api/admin/logs?${query.toString()}`);
  },
);

export type AuditAccess =
  | { status: "ok"; audit: Audit; user: User | null }
  | { status: "login" }
  | { status: "not_found" }
  | { status: "error"; message: string };

export const getAuditAccess = cache(
  async (auditId: number): Promise<AuditAccess> => {
    const user = await getCurrentUser();
    try {
      const audit = await getAudit(auditId);
      return { status: "ok", audit, user };
    } catch (error) {
      if (!(error instanceof ServerApiError)) {
        return {
          status: "error",
          message: "L'API SouverainOS est indisponible.",
        };
      }
      if (error.status === 401 || error.status === 403) {
        return { status: "login" };
      }
      if (error.status === 404) {
        return { status: "not_found" };
      }
      return { status: "error", message: error.message };
    }
  },
);

export function canWrite(user: User | null): boolean {
  return user?.role === "admin_ght" || user?.role === "auditeur";
}

export function canAdmin(user: User | null): boolean {
  return user?.role === "admin_ght";
}
