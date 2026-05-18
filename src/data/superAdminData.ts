/** Placeholder platform metrics until GET /auth/superadmin/stats is available. */

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
