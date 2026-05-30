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
