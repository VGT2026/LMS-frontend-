import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, BookOpen, DollarSign, TrendingUp, ChevronRight, FileText } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { courseAPI, dashboardAPI, supportAPI } from "@/services/api";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface CourseItem {
  id: number;
  title: string;
  category: string;
  instructor?: string;
  is_active?: boolean;
}

interface SupportTicketRow {
  id: number;
  subject: string;
  category: string;
  message: string;
  created_at?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

// Placeholder chart data (no historical API - maintain design)
const chartPlaceholder = [
  { month: "Jan", users: 0, revenue: 0 },
  { month: "Feb", users: 0, revenue: 0 },
  { month: "Mar", users: 0, revenue: 0 },
  { month: "Apr", users: 0, revenue: 0 },
  { month: "May", users: 0, revenue: 0 },
  { month: "Jun", users: 0, revenue: 0 },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState<{ totalUsers: number; activeUsers: number; totalCourses: number; activeCourses: number } | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiIssues, setApiIssues] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setApiIssues([]);

        const [statsOutcome, coursesOutcome, ticketsOutcome] = await Promise.allSettled([
          dashboardAPI.getAdminStatsStrict(),
          courseAPI.getAllCourses({ limit: 8 }),
          supportAPI.listTicketsForAdmin({ limit: 6 }),
        ]);

        const warnings: string[] = [];

        if (statsOutcome.status === "fulfilled") {
          const { stats: s, error } = statsOutcome.value;
          if (error) {
            warnings.push(`Statistics: ${error}`);
            setStats(null);
          } else {
            setStats(s);
          }
        } else {
          setStats(null);
          warnings.push("Statistics could not be loaded.");
        }

        if (coursesOutcome.status === "fulfilled") {
          const coursesRes = coursesOutcome.value;
          const list = coursesRes?.data ?? [];
          setCourses(Array.isArray(list) ? list : []);
        } else {
          setCourses([]);
          const msg = coursesOutcome.reason instanceof Error ? coursesOutcome.reason.message : "Courses could not be loaded.";
          warnings.push(`Courses: ${msg}`);
        }

        if (ticketsOutcome.status === "fulfilled") {
          const rows = ticketsOutcome.value;
          setTickets(Array.isArray(rows) ? rows : []);
        } else {
          setTickets([]);
          const msg =
            ticketsOutcome.reason instanceof Error ? ticketsOutcome.reason.message : "Support tickets could not be loaded.";
          warnings.push(`Support: ${msg}`);
        }

        setApiIssues(warnings);
      } catch {
        setStats(null);
        setCourses([]);
        setTickets([]);
        setApiIssues(["Admin dashboard requests failed unexpectedly."]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="space-y-6 max-w-7xl">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </motion.div>

      {apiIssues.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground space-y-1"
          role="alert"
        >
          <p className="font-medium">Some data could not be loaded from the API (HTTP 5xx indicates a backend problem).</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            {apiIssues.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            Open your API host logs (Railway deployment for <span className="font-mono">lms-production-7308</span>) for the failing route and stack trace—not the frontend build.
          </p>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: loading ? "—" : stats == null ? "—" : stats.totalUsers.toLocaleString(), icon: Users, color: "text-primary bg-primary/10" },
          { label: "Active Users", value: loading ? "—" : stats == null ? "—" : stats.activeUsers.toLocaleString(), icon: Users, color: "text-accent bg-accent/10" },
          { label: "Total Courses", value: loading ? "—" : stats == null ? "—" : String(stats.totalCourses), icon: BookOpen, color: "text-success bg-success/10" },
          { label: "Published Courses", value: loading ? "—" : stats == null ? "—" : String(stats.activeCourses), icon: TrendingUp, color: "text-warning bg-warning/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts - placeholder (no historical data from API) */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartPlaceholder}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(224, 65%, 33%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(224, 65%, 33%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214, 20%, 90%)", fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="hsl(224, 65%, 33%)" fill="url(#userGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartPlaceholder}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(168, 76%, 40%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(168, 76%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214, 20%, 90%)", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(168, 76%, 40%)" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Support Tickets */}
      <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recent Support Tickets</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading tickets...</div>
          ) : !tickets.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No tickets yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">{t.user_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{t.user_email || ""}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{t.user_role || ""}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{t.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.message}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{t.category}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Admin Created Courses */}
      <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Admin Created Courses</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/create-course">Create Course</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/courses" className="gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No courses yet. <Link to="/admin/create-course" className="text-primary hover:underline">Create your first course</Link></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instructor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">{course.title}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{course.category}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{course.instructor || "Unassigned"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${course.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {course.is_active ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/admin/courses`}>Manage</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Quick links - no duplicate user/course tables */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/users" className="bg-card rounded-xl p-5 border border-border shadow-card hover:shadow-elevated transition-shadow flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Manage Users</p>
              <p className="text-xs text-muted-foreground">Add instructors, manage roles</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </Link>
        <Link to="/admin/create-course" className="bg-card rounded-xl p-5 border border-border shadow-card hover:shadow-elevated transition-shadow flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Create Course</p>
              <p className="text-xs text-muted-foreground">Add new course and assign instructor</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
