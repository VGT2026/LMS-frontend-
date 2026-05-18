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
  const tenantName = u.tenant_name ?? u.tenantName ?? nested?.name;
  if (tenantId == null && (tenantName == null || tenantName === "")) return {};
  return {
    tenantId: tenantId != null && tenantId !== "" ? String(tenantId) : undefined,
    tenantName: tenantName != null && String(tenantName) !== "" ? String(tenantName) : undefined,
  };
}
