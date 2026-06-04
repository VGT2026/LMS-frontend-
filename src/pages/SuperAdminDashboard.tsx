import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  Building2,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  Server,
  GraduationCap,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  authAPI,
  formatApiErrorMessage,
  readHttpStatus,
  supportAPI,
} from "@/services/api";
import {
  normalizeSuperadminStats,
  type SuperadminStatsPayload,
} from "@/data/superAdminData";
import { formatTenantLabel } from "@/utils/tenant";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<SuperadminStatsPayload | null>(null);
  const [supportCount, setSupportCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statsOutcome, ticketsOutcome] = await Promise.allSettled([
        authAPI.getSuperadminStats(),
        supportAPI.listTicketsForAdmin({ limit: 50 }),
      ]);

      if (statsOutcome.status === "fulfilled") {
        const parsed = normalizeSuperadminStats(statsOutcome.value);
        if (!parsed) {
          setStats(null);
          setLoadError("Stats response was empty or invalid.");
        } else {
          setStats(parsed);
        }
      } else {
        setStats(null);
        const err = statsOutcome.reason;
        const msg =
          err instanceof Error
            ? formatApiErrorMessage(err.message, readHttpStatus(err))
            : "Could not load platform statistics.";
        setLoadError(msg);
      }

      if (ticketsOutcome.status === "fulfilled") {
        const rows = Array.isArray(ticketsOutcome.value) ? ticketsOutcome.value : [];
        setSupportCount(rows.length);
      } else {
        setSupportCount(null);
      }
    } catch (e) {
      setStats(null);
      setLoadError(
        e instanceof Error ? e.message : "Failed to load superadmin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, reloadKey]);

  const tenantChartData = useMemo(() => {
    if (!stats?.byTenant.length) return [];
    return stats.byTenant.slice(0, 8).map((t) => ({
      name: t.name.length > 14 ? `${t.name.slice(0, 12)}…` : t.name,
      fullName: t.name,
      users: t.totalUsers,
      courses: t.activeCourses,
    }));
  }, [stats]);

  const orgCount = stats?.byTenant.length ?? 0;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-6 max-w-7xl"
    >
      <motion.div variants={fadeUp} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" /> Super Admin
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Platform Control Center</h1>
          <p className="text-muted-foreground mt-1">
            Live metrics from your LMS API — organizations, users, and courses across all tenants.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-1">
            <Link to="/superadmin/tenants">
              <Building2 className="h-4 w-4" /> Organizations
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1">
            <Link to="/superadmin/users">
              Students &amp; instructors
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1">
            <Link to="/superadmin/admins">
              Platform admins
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>

      {loadError && (
        <motion.div variants={fadeUp}>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not load platform stats</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{loadError}</p>
              <p className="text-xs">
                Expected route:{" "}
                <code className="bg-muted px-1 rounded">GET /api/auth/superadmin/stats</code> (superadmin
                JWT required).
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={loading}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Organizations",
            value: loading ? "—" : stats ? String(orgCount) : "—",
            icon: Building2,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Total Users",
            value: loading ? "—" : stats ? stats.totalUsers.toLocaleString() : "—",
            icon: Users,
            color: "text-accent bg-accent/10",
          },
          {
            label: "Platform Admins",
            value: loading ? "—" : stats ? String(stats.totalAdmins) : "—",
            icon: Shield,
            color: "text-warning bg-warning/10",
          },
          {
            label: "Students",
            value: loading ? "—" : stats ? stats.totalStudents.toLocaleString() : "—",
            icon: GraduationCap,
            color: "text-success bg-success/10",
          },
        ].map((stat) => (
          <motion.div key={stat.label} className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Active courses (all tenants)</p>
            <p className="text-xl font-bold">
              {loading ? "—" : stats != null ? stats.activeCourses : "—"}
            </p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <Users className="w-8 h-8 text-accent" />
          <div>
            <p className="text-sm text-muted-foreground">Instructors</p>
            <p className="text-xl font-bold">
              {loading ? "—" : stats != null ? stats.totalInstructors : "—"}
            </p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <FileText className="w-8 h-8 text-destructive" />
          <div>
            <p className="text-sm text-muted-foreground">Recent support requests</p>
            <p className="text-xl font-bold">
              {loading ? "—" : supportCount != null ? supportCount : "—"}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <Server className="w-5 h-5 text-success shrink-0" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-success">API connected</span>
          {stats && !loading
            ? ` — ${stats.activeUsers.toLocaleString()} active users, ${stats.totalCourses} total courses.`
            : loading
              ? " — loading platform metrics…"
              : " — stats unavailable."}
        </p>
      </motion.div>

      {tenantChartData.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Users by organization</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tenantChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(214, 20%, 90%)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [value, "Users"]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullName ?? _label
                  }
                />
                <Bar dataKey="users" fill="hsl(224, 65%, 33%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Active courses by organization</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tenantChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(214, 20%, 90%)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [value, "Courses"]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullName ?? _label
                  }
                />
                <Bar dataKey="courses" fill="hsl(168, 76%, 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {stats && stats.byTenant.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Organizations overview</h3>
            <Button asChild variant="outline" size="sm">
              <Link to="/superadmin/tenants">Manage organizations</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium text-right">Users</th>
                  <th className="px-4 py-3 font-medium text-right">Students</th>
                  <th className="px-4 py-3 font-medium text-right">Instructors</th>
                  <th className="px-4 py-3 font-medium text-right">Admins</th>
                  <th className="px-4 py-3 font-medium text-right">Courses</th>
                </tr>
              </thead>
              <tbody>
                {stats.byTenant.map((t) => (
                  <tr key={t.tenantId} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatTenantLabel(t.name)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.totalUsers}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.totalStudents}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.totalInstructors}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.totalAdmins}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.activeCourses}
                      <span className="text-muted-foreground text-xs"> / {t.totalCourses}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SuperAdminDashboard;
