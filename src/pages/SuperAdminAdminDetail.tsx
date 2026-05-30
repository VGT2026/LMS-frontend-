import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { authAPI, formatApiErrorMessage, normalizeUsersList, readHttpStatus } from "@/services/api";
import { formatTenantLabel, parseTenantFromApiUser } from "@/utils/tenant";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  GraduationCap,
  Search,
  Shield,
  Users,
} from "lucide-react";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  enrolled: number;
  createdAt: string;
}

interface AdminInfo {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  tenantId?: string;
  tenantName?: string;
}

function mapMember(user: Record<string, unknown>): MemberRow {
  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? "—"),
    email: String(user.email ?? ""),
    status: user.is_active === false || user.is_active === 0 ? "inactive" : "active",
    enrolled: Number(user.enrolled ?? 0),
    createdAt: String(user.created_at ?? user.createdAt ?? ""),
  };
}

function formatCreatedAt(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function MembersTable({
  rows,
  emptyMessage,
  showEnrolled,
  onToggleStatus,
}: {
  rows: MemberRow[];
  emptyMessage: string;
  showEnrolled?: boolean;
  onToggleStatus: (id: string) => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
              {showEnrolled && (
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Enrolled</th>
              )}
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Joined</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showEnrolled ? 5 : 4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        <p className="text-xs text-muted-foreground/80">ID {u.id}</p>
                      </div>
                    </div>
                  </td>
                  {showEnrolled && (
                    <td className="px-5 py-3 text-sm text-foreground">
                      {u.enrolled} course{u.enrolled === 1 ? "" : "s"}
                    </td>
                  )}
                  <td className="px-5 py-3 text-sm text-muted-foreground">{formatCreatedAt(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Switch checked={u.status === "active"} onCheckedChange={() => onToggleStatus(u.id)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SuperAdminAdminDetail = () => {
  const { adminId } = useParams<{ adminId: string }>();
  const { toast } = useToast();
  useAuth();

  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [students, setStudents] = useState<MemberRow[]>([]);
  const [instructors, setInstructors] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scopeWarning, setScopeWarning] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"students" | "instructors">("students");

  const loadAdmin = useCallback(async (): Promise<AdminInfo | null> => {
    const res = await authAPI.listAdmins({ limit: 500 });
    const rows = normalizeUsersList(res) as Record<string, unknown>[];
    const match = rows.find((u) => String(u.id ?? "") === String(adminId));
    if (!match) return null;
    const tenant = parseTenantFromApiUser(match);
    return {
      id: String(match.id ?? ""),
      name: String(match.name ?? "Admin"),
      email: String(match.email ?? ""),
      status: match.is_active === false ? "inactive" : "active",
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
    };
  }, [adminId]);

  const load = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const adminInfo = await loadAdmin();
      if (!adminInfo) {
        setLoadError("Admin not found. They may have been removed.");
        setAdmin(null);
        setStudents([]);
        setInstructors([]);
        setScopeWarning(false);
        return;
      }
      setScopeWarning(false);
      setAdmin(adminInfo);

      const overview = await authAPI.getAdminOverview({
        id: adminInfo.id,
        tenant_id: adminInfo.tenantId,
        tenant_name: adminInfo.tenantName,
      });
      setStudents(overview.students.map(mapMember));
      setInstructors(overview.instructors.map(mapMember));
      // Warn if we have a tenant but couldn't actually scope (rows lacked tenant info).
      setScopeWarning(!!adminInfo.tenantId && !overview.scoped);
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not load this admin's organization.";
      setLoadError(msg);
      setStudents([]);
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, [adminId, loadAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterRows = useCallback(
    (rows: MemberRow[]) => {
      const q = search.trim().toLowerCase();
      if (!q) return rows;
      return rows.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.includes(q)
      );
    },
    [search]
  );

  const filteredStudents = useMemo(() => filterRows(students), [filterRows, students]);
  const filteredInstructors = useMemo(() => filterRows(instructors), [filterRows, instructors]);

  const handleToggleStatus = async (id: string, role: "student" | "instructor") => {
    try {
      const response = await authAPI.toggleUserStatus(parseInt(id, 10));
      if (response?.success) {
        const active = response.data?.is_active !== false && response.data?.is_active !== 0;
        const status: "active" | "inactive" = active ? "active" : "inactive";
        if (role === "student") {
          setStudents((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
        } else {
          setInstructors((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
        }
        toast({ title: "Status updated", description: "User account status changed." });
      } else {
        throw new Error(response?.message || "Update failed");
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not update status.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground">
          <Link to="/superadmin/admins">
            <ArrowLeft className="h-4 w-4" />
            Platform admins
          </Link>
        </Button>

        {admin && (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-lg font-semibold shrink-0">
              {admin.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                {admin.name}
                <Shield className="w-4 h-4 text-primary" />
              </h1>
              <p className="text-muted-foreground text-sm">{admin.email}</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                {formatTenantLabel(admin.tenantName)}
              </p>
            </div>
          </div>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load organization</AlertTitle>
          <AlertDescription className="text-sm">{loadError}</AlertDescription>
        </Alert>
      )}

      {admin && !admin.tenantId && !loadError && (
        <Alert>
          <AlertTitle>No organization linked</AlertTitle>
          <AlertDescription className="text-sm">
            This admin is not linked to a tenant, so members cannot be scoped to their organization. Add a
            tenant for this admin on the backend to see their students and instructors.
          </AlertDescription>
        </Alert>
      )}

      {admin && admin.tenantId && scopeWarning && !loadError && (
        <Alert>
          <AlertTitle>Showing unscoped results</AlertTitle>
          <AlertDescription className="text-sm">
            The API did not return tenant info on each user, so these lists could not be filtered to{" "}
            {formatTenantLabel(admin.tenantName)} only. Ask the backend to include <code>tenant_id</code> on
            student/instructor rows (or implement the per-admin overview endpoint) to differentiate members by
            admin.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg text-primary bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total members</p>
            <p className="text-xl font-bold text-foreground">{students.length + instructors.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg text-accent bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="text-xl font-bold text-foreground">{students.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg text-warning bg-warning/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Instructors</p>
            <p className="text-xl font-bold text-foreground">{instructors.length}</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "students" | "instructors")}>
        <TabsList>
          <TabsTrigger value="students" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Students ({filteredStudents.length})
          </TabsTrigger>
          <TabsTrigger value="instructors" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Instructors ({filteredInstructors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <MembersTable
            rows={filteredStudents}
            showEnrolled
            emptyMessage={loadError ? "Unable to load students." : "No students in this organization yet."}
            onToggleStatus={(id) => void handleToggleStatus(id, "student")}
          />
        </TabsContent>

        <TabsContent value="instructors" className="mt-4">
          <MembersTable
            rows={filteredInstructors}
            emptyMessage={loadError ? "Unable to load instructors." : "No instructors in this organization yet."}
            onToggleStatus={(id) => void handleToggleStatus(id, "instructor")}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SuperAdminAdminDetail;
