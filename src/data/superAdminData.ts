/** Types and normalizers for superadmin platform APIs. */

import { getDisplayTenantName, isPlaceholderTenantName } from "@/utils/tenant";

export interface PlatformAdminRecord {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
  tenantId?: string;
  tenantName?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SuperadminTenantStats {
  tenantId: number;
  name: string;
  slug?: string | null;
  totalUsers: number;
  activeUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalAdmins: number;
  totalCourses: number;
  activeCourses: number;
}

export interface SuperadminStatsPayload {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  totalSuperadmins: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  activeCourses: number;
  byTenant: SuperadminTenantStats[];
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapTenantRow(row: Record<string, unknown>): SuperadminTenantStats | null {
  const rawName = String(row.name ?? "").trim();
  if (!rawName || isPlaceholderTenantName(rawName)) return null;
  const display = getDisplayTenantName(rawName) ?? rawName;
  return {
    tenantId: num(row.tenantId ?? row.tenant_id ?? row.id),
    name: display,
    slug: row.slug != null ? String(row.slug) : null,
    totalUsers: num(row.totalUsers ?? row.total_users),
    activeUsers: num(row.activeUsers ?? row.active_users),
    totalStudents: num(row.totalStudents ?? row.total_students),
    totalInstructors: num(row.totalInstructors ?? row.total_instructors),
    totalAdmins: num(row.totalAdmins ?? row.total_admins),
    totalCourses: num(row.totalCourses ?? row.total_courses),
    activeCourses: num(row.activeCourses ?? row.active_courses),
  };
}

/** Parse GET /api/auth/superadmin/stats response. */
export function normalizeSuperadminStats(response: unknown): SuperadminStatsPayload | null {
  if (response == null || typeof response !== "object") return null;
  const root = response as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  if (!data || typeof data !== "object") return null;

  const rawTenants = Array.isArray(data.byTenant)
    ? data.byTenant
    : Array.isArray(data.by_tenant)
      ? data.by_tenant
      : [];

  const byTenant = rawTenants
    .filter((t): t is Record<string, unknown> => t != null && typeof t === "object")
    .map(mapTenantRow)
    .filter((t): t is SuperadminTenantStats => t != null)
    .sort((a, b) => b.totalUsers - a.totalUsers);

  return {
    totalUsers: num(data.totalUsers ?? data.total_users),
    activeUsers: num(data.activeUsers ?? data.active_users),
    totalAdmins: num(data.totalAdmins ?? data.total_admins),
    totalSuperadmins: num(data.totalSuperadmins ?? data.total_superadmins),
    totalInstructors: num(data.totalInstructors ?? data.total_instructors),
    totalStudents: num(data.totalStudents ?? data.total_students),
    totalCourses: num(data.totalCourses ?? data.total_courses),
    activeCourses: num(data.activeCourses ?? data.active_courses),
    byTenant,
  };
}
