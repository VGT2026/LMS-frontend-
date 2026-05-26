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
