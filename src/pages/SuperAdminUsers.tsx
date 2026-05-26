import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  authAPI,
  formatApiErrorMessage,
  normalizeTenantsList,
  normalizeUsersList,
  readHttpStatus,
} from "@/services/api";
import type { TenantRecord } from "@/data/superAdminData";
import { formatTenantLabel, parseTenantFromApiUser } from "@/utils/tenant";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BookOpen, GraduationCap, Search, Users } from "lucide-react";

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor";
  status: "active" | "inactive";
  enrolled: number;
  createdAt: string;
  tenantName?: string;
}

function mapApiUser(user: Record<string, unknown>, role: "student" | "instructor"): PlatformUserRow {
  const tenant = parseTenantFromApiUser(user);
  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? "—"),
    email: String(user.email ?? ""),
    role,
    status: user.is_active === false || user.is_active === 0 ? "inactive" : "active",
    enrolled: Number(user.enrolled ?? 0),
    createdAt: String(user.created_at ?? user.createdAt ?? ""),
    tenantName: tenant.tenantName,
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

function UsersTable({
  rows,
  emptyMessage,
  onToggleStatus,
  currentUserId,
}: {
  rows: PlatformUserRow[];
  emptyMessage: string;
  onToggleStatus: (id: string) => void;
  currentUserId?: string;
}) {
  return (
    <motion.div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Organization</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Enrolled</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Joined</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
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
                  <td className="px-5 py-3 text-sm text-muted-foreground">{formatTenantLabel(u.tenantName)}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{u.enrolled} course{u.enrolled === 1 ? "" : "s"}</td>
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
                    <Switch
                      checked={u.status === "active"}
                      onCheckedChange={() => onToggleStatus(u.id)}
                      disabled={currentUserId === u.id}
                      title={currentUserId === u.id ? "Cannot deactivate your own account" : undefined}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

const SuperAdminUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"students" | "instructors">("students");
  const [students, setStudents] = useState<PlatformUserRow[]>([]);
  const [instructors, setInstructors] = useState<PlatformUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [tenants, setTenants] = useState<TenantRecord[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await authAPI.listTenants({ limit: 200 });
        const rows = normalizeTenantsList(res) as Record<string, unknown>[];
        setTenants(
          rows.map((r) => ({
            id: String(r.id ?? ""),
            name: String(r.name ?? "Organization"),
          }))
        );
      } catch {
        setTenants([]);
      }
    })();
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const tenantId = tenantFilter !== "all" ? tenantFilter : undefined;
    try {
      const [studentsRes, instructorsRes] = await Promise.all([
        authAPI.listStudents({ limit: 500, search: search.trim() || undefined, tenant_id: tenantId }),
        authAPI.listInstructors({ limit: 500, search: search.trim() || undefined, tenant_id: tenantId }),
      ]);

      const studentRows = normalizeUsersList(studentsRes) as Record<string, unknown>[];
      const instructorRows = normalizeUsersList(instructorsRes) as Record<string, unknown>[];

      setStudents(
        studentRows
          .filter((u) => String(u.role ?? "student").toLowerCase() === "student")
          .map((u) => mapApiUser(u, "student"))
      );
      setInstructors(
        instructorRows
          .filter((u) => String(u.role ?? "instructor").toLowerCase() === "instructor")
          .map((u) => mapApiUser(u, "instructor"))
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not load users.";
      setLoadError(msg);
      setStudents([]);
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, [search, tenantFilter]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadUsers(), search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [loadUsers, search, tenantFilter]);

  const filterRows = (rows: PlatformUserRow[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.includes(q)
    );
  };

  const filteredStudents = useMemo(() => filterRows(students), [students, search]);
  const filteredInstructors = useMemo(() => filterRows(instructors), [instructors, search]);

  const handleToggleStatus = async (id: string, role: "student" | "instructor") => {
    try {
      const response = await authAPI.toggleUserStatus(parseInt(id, 10));
      if (response?.success) {
        const active = response.data?.is_active !== false && response.data?.is_active !== 0;
        const status = active ? "active" : "inactive";
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

  if (loading && students.length === 0 && instructors.length === 0) {
    return (
      <motion.div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <motion.div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground">
          <Link to="/superadmin">
            <ArrowLeft className="h-4 w-4" />
            Platform dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Students & Instructors</h1>
        <p className="text-muted-foreground mt-1">All platform learners and teaching staff from the database</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg text-primary bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
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

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load users</AlertTitle>
          <AlertDescription className="text-sm">{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {tenants.length > 0 && (
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          <UsersTable
            rows={filteredStudents}
            emptyMessage={loadError ? "Unable to load students." : "No students found."}
            onToggleStatus={(id) => void handleToggleStatus(id, "student")}
            currentUserId={user?.id}
          />
        </TabsContent>

        <TabsContent value="instructors" className="mt-4">
          <UsersTable
            rows={filteredInstructors}
            emptyMessage={loadError ? "Unable to load instructors." : "No instructors found."}
            onToggleStatus={(id) => void handleToggleStatus(id, "instructor")}
            currentUserId={user?.id}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SuperAdminUsers;
