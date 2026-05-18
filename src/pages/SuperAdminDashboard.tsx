import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  Building2,
  DollarSign,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  Server,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { superAdminStats } from "@/data/superAdminData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const SuperAdminDashboard = () => {
  const stats = superAdminStats;

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
          <p className="text-muted-foreground mt-1">Cross-tenant overview and platform administration</p>
        </div>
        <Button asChild variant="outline" className="gap-1">
          <Link to="/superadmin/admins">
            Manage platform admins
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tenants", value: stats.totalTenants, icon: Building2, color: "text-primary bg-primary/10" },
          { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-accent bg-accent/10" },
          { label: "Platform Admins", value: stats.platformAdmins, icon: Shield, color: "text-warning bg-warning/10" },
          { label: "MRR", value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success bg-success/10" },
        ].map((stat) => (
          <motion.div key={stat.label} className="bg-card rounded-xl p-5 border border-border shadow-card">
            <motion.div className="flex items-center justify-between">
              <motion.div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </motion.div>
              <motion.div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <motion.div>
            <p className="text-sm text-muted-foreground">Active courses (all tenants)</p>
            <p className="text-xl font-bold">{stats.activeCourses}</p>
          </motion.div>
        </motion.div>
        <motion.div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <motion.div>
            <p className="text-sm text-muted-foreground">Open incidents</p>
            <p className="text-xl font-bold">{stats.openIncidents}</p>
          </motion.div>
        </motion.div>
        <motion.div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <Server className="w-8 h-8 text-success" />
          <motion.div>
            <p className="text-sm text-muted-foreground">System status</p>
            <p className="text-sm font-semibold text-success">All systems operational</p>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform user growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.userGrowth}>
              <defs>
                <linearGradient id="saUserGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(224, 65%, 33%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(224, 65%, 33%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214, 20%, 90%)", fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="hsl(224, 65%, 33%)" fill="url(#saUserGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.revenueByMonth}>
              <defs>
                <linearGradient id="saRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(168, 76%, 40%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(168, 76%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214, 20%, 90%)", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(168, 76%, 40%)" fill="url(#saRevGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Sample platform metrics until{" "}
        <code className="text-xs bg-muted px-1 rounded">GET /auth/superadmin/stats</code> is connected on the API.
        {/* vercel.json already rewrites all routes (including /superadmin/*) to index.html for SPA */}
      </motion.div>
    </motion.div>
  );
};

export default SuperAdminDashboard;
