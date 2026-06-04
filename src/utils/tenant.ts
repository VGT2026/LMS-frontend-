/** Backend default tenant label — not shown to end users in the app chrome. */
const PLACEHOLDER_TENANT_NAMES = new Set([
  "platform default",
  "default",
  "default tenant",
  "default organization",
]);

export function isPlaceholderTenantName(name?: string | null): boolean {
  if (!name?.trim()) return true;
  const normalized = name.trim().toLowerCase();
  return PLACEHOLDER_TENANT_NAMES.has(normalized) || normalized.startsWith("platform default");
}

/** User-facing organization name; hides system placeholder labels from the API. */
export function getDisplayTenantName(name?: string | null): string | undefined {
  if (!name?.trim() || isPlaceholderTenantName(name)) return undefined;
  return name.trim();
}

/** Table cells: real name, em dash for placeholders/missing. */
export function formatTenantLabel(name?: string | null): string {
  return getDisplayTenantName(name) ?? "—";
}

/** Map tenant fields from API user payloads (snake_case, camelCase, or nested tenant). */
export function parseTenantFromApiUser(
  u: Record<string, unknown> | null | undefined
): { tenantId?: string; tenantName?: string } {
  if (!u || typeof u !== "object") return {};
  const nested =
    u.tenant && typeof u.tenant === "object" && !Array.isArray(u.tenant)
      ? (u.tenant as Record<string, unknown>)
      : undefined;
  const tenantId = u.tenant_id ?? u.tenantId ?? nested?.id;
  const rawName = u.tenant_name ?? u.tenantName ?? nested?.name;
  const tenantName = getDisplayTenantName(rawName != null ? String(rawName) : undefined);
  if (tenantId == null && !tenantName) return {};
  return {
    tenantId: tenantId != null && tenantId !== "" ? String(tenantId) : undefined,
    tenantName,
  };
}

/** Raw tenant id/name off any API row (course, user, etc.) without placeholder filtering. */
export function getTenantKeyFromRow(
  row: Record<string, unknown> | null | undefined
): { tenantId?: string; tenantName?: string } {
  if (!row || typeof row !== "object") return {};
  const nested =
    row.tenant && typeof row.tenant === "object" && !Array.isArray(row.tenant)
      ? (row.tenant as Record<string, unknown>)
      : undefined;
  const id = row.tenant_id ?? row.tenantId ?? nested?.id;
  const name = row.tenant_name ?? row.tenantName ?? nested?.name;
  return {
    tenantId: id != null && id !== "" ? String(id) : undefined,
    tenantName: name != null && String(name).trim() ? String(name).trim().toLowerCase() : undefined,
  };
}

/**
 * Client-side safety filter: keep only rows that belong to the viewer's tenant.
 * Only filters when (a) we know the viewer's tenant and (b) at least one row
 * actually carries tenant info. If no row has tenant data (backend doesn't send
 * it yet) the original list is returned so nothing disappears unexpectedly.
 */
export function scopeRowsToTenant<T extends Record<string, unknown>>(
  rows: T[],
  viewerTenantId?: string,
  viewerTenantName?: string
): { rows: T[]; filtered: boolean; tenantDataPresent: boolean } {
  const wantId = viewerTenantId != null && viewerTenantId !== "" ? String(viewerTenantId) : undefined;
  const wantName = viewerTenantName?.trim().toLowerCase() || undefined;
  if (!wantId && !wantName) return { rows, filtered: false, tenantDataPresent: false };

  const tenantDataPresent = rows.some((r) => {
    const { tenantId, tenantName } = getTenantKeyFromRow(r);
    return tenantId != null || tenantName != null;
  });
  if (!tenantDataPresent) return { rows, filtered: false, tenantDataPresent: false };

  const scoped = rows.filter((r) => {
    const { tenantId, tenantName } = getTenantKeyFromRow(r);
    if (wantId && tenantId != null) return tenantId === wantId;
    if (wantName && tenantName != null) return tenantName === wantName;
    return false;
  });
  return { rows: scoped, filtered: true, tenantDataPresent: true };
}

export type OrganizationGroup<T> = {
  key: string;
  label: string;
  rows: T[];
};

/** Group API rows by organization for admin tables (courses, users, etc.). */
export function groupRowsByOrganization<T extends Record<string, unknown>>(
  rows: T[],
  getLabel?: (row: T) => string | undefined
): OrganizationGroup<T>[] {
  const map = new Map<string, OrganizationGroup<T>>();

  for (const row of rows) {
    const { tenantId, tenantName } = getTenantKeyFromRow(row);
    const custom = getLabel?.(row);
    const nested =
      row.tenant && typeof row.tenant === "object" && !Array.isArray(row.tenant)
        ? (row.tenant as Record<string, unknown>)
        : undefined;
    const rawName = row.tenant_name ?? row.tenantName ?? nested?.name;
    const displayName = getDisplayTenantName(rawName != null ? String(rawName) : undefined);
    const key = tenantId ?? tenantName ?? "__none__";
    const label =
      custom ?? displayName ?? (tenantId ? `Organization #${tenantId}` : "Unassigned");
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(key, { key, label, rows: [row] });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

type InstructorTenantRef = {
  id: number;
  tenantId?: string;
  organizationLabel?: string;
};

/** When API omits tenant on course rows, infer from the assigned instructor. */
export function enrichCoursesWithInstructorTenant<T extends Record<string, unknown>>(
  courses: T[],
  instructors: InstructorTenantRef[]
): T[] {
  const byId = new Map(instructors.map((i) => [i.id, i]));
  return courses.map((course) => {
    const row = course as Record<string, unknown> & {
      instructor_id?: number;
      tenantId?: string;
      organizationLabel?: string;
    };
    if (row.tenantId) return course;
    const instructorId =
      row.instructor_id != null
        ? Number(row.instructor_id)
        : row.instructorId != null
          ? Number(row.instructorId)
          : undefined;
    if (instructorId == null || Number.isNaN(instructorId)) return course;
    const inst = byId.get(instructorId);
    if (!inst?.tenantId) return course;
    return {
      ...course,
      tenantId: inst.tenantId,
      tenant_name: inst.organizationLabel,
      organizationLabel: inst.organizationLabel,
    } as T;
  });
}

/**
 * Admin course list: only courses in the viewer's organization.
 * Uses tenant on course rows, then instructor tenant, then instructor id membership.
 */
export function filterCoursesForOrgViewer<T extends Record<string, unknown>>(
  courses: T[],
  instructors: InstructorTenantRef[],
  options: {
    isSuperadmin: boolean;
    viewerTenantId?: string;
    viewerTenantName?: string;
    selectedTenantId?: string;
  }
): T[] {
  const enriched = enrichCoursesWithInstructorTenant(courses, instructors);

  if (options.isSuperadmin) {
    if (options.selectedTenantId && options.selectedTenantId !== "all") {
      const want = String(options.selectedTenantId);
      return enriched.filter((c) => {
        const { tenantId } = getTenantKeyFromRow(c);
        return tenantId === want;
      });
    }
    return enriched;
  }

  const { rows, filtered } = scopeRowsToTenant(
    enriched,
    options.viewerTenantId,
    options.viewerTenantName
  );
  if (filtered) return rows;

  // Trust API + enrichCoursesWithInstructorTenant (do not limit to instructor id list only)
  return enriched;
}
