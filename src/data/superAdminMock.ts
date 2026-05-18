/** Platform-level mock data for Super Admin dashboard (demo / offline). */

export interface PlatformAdminRecord {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
}

export const superAdminStats = {
  totalTenants: 12,
  totalUsers: 45200,
  platformAdmins: 8,
  monthlyRevenue: 128400,
  activeCourses: 156,
  openIncidents: 3,
  userGrowth: [
    { month: "Jan", users: 32000 },
    { month: "Feb", users: 35800 },
    { month: "Mar", users: 38900 },
    { month: "Apr", users: 41200 },
    { month: "May", users: 43100 },
    { month: "Jun", users: 45200 },
  ],
  revenueByMonth: [
    { month: "Jan", revenue: 98000 },
    { month: "Feb", revenue: 102400 },
    { month: "Mar", revenue: 108200 },
    { month: "Apr", revenue: 115600 },
    { month: "May", revenue: 121800 },
    { month: "Jun", revenue: 128400 },
  ],
};

export const defaultPlatformAdmins: PlatformAdminRecord[] = [
  {
    id: "mock-admin-1",
    name: "Platform Admin",
    email: "admin@teachsmart.io",
    status: "active",
    createdAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: "mock-admin-2",
    name: "Regional Admin",
    email: "regional@teachsmart.io",
    status: "active",
    createdAt: "2026-01-15T14:30:00.000Z",
  },
];

const MOCK_ADMINS_STORAGE_KEY = "lms_mock_platform_admins";

export function useMockSuperAdmin(): boolean {
  return import.meta.env.VITE_USE_MOCK_SUPERADMIN === "true";
}

export function loadMockPlatformAdmins(): PlatformAdminRecord[] {
  try {
    const raw = localStorage.getItem(MOCK_ADMINS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_ADMINS_STORAGE_KEY, JSON.stringify(defaultPlatformAdmins));
      return [...defaultPlatformAdmins];
    }
    const parsed = JSON.parse(raw) as PlatformAdminRecord[];
    return Array.isArray(parsed) ? parsed : [...defaultPlatformAdmins];
  } catch {
    return [...defaultPlatformAdmins];
  }
}

export function saveMockPlatformAdmins(admins: PlatformAdminRecord[]): void {
  localStorage.setItem(MOCK_ADMINS_STORAGE_KEY, JSON.stringify(admins));
}

export function appendMockPlatformAdmin(
  input: Omit<PlatformAdminRecord, "id" | "createdAt" | "status"> & { status?: PlatformAdminRecord["status"] }
): PlatformAdminRecord {
  const admins = loadMockPlatformAdmins();
  const record: PlatformAdminRecord = {
    id: `mock-admin-${Date.now()}`,
    name: input.name,
    email: input.email.toLowerCase(),
    status: input.status ?? "active",
    createdAt: new Date().toISOString(),
  };
  saveMockPlatformAdmins([record, ...admins]);
  return record;
}

export function toggleMockPlatformAdminStatus(id: string): PlatformAdminRecord[] {
  const admins = loadMockPlatformAdmins().map((a) =>
    a.id === id ? { ...a, status: a.status === "active" ? ("inactive" as const) : ("active" as const) } : a
  );
  saveMockPlatformAdmins(admins);
  return admins;
}
