import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { authAPI, formatApiErrorMessage, normalizeUsersList, readHttpStatus } from "@/services/api";
import type { PlatformAdminRecord } from "@/data/superAdminData";
import { formatTenantLabel, parseTenantFromApiUser } from "@/utils/tenant";
import { Shield, UserPlus, Search, ArrowLeft, Users, ChevronRight } from "lucide-react";

function formatCreatedAt(iso: string) {
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

function apiRowToRecord(user: Record<string, unknown>): PlatformAdminRecord {
  const tenant = parseTenantFromApiUser(user);
  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? "Admin"),
    email: String(user.email ?? ""),
    status: user.is_active === false ? "inactive" : "active",
    createdAt: String(user.created_at ?? user.createdAt ?? new Date().toISOString()),
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
  };
}

const SuperAdminAdmins = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [admins, setAdmins] = useState<PlatformAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
  });

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authAPI.listAdmins();
      const rows = normalizeUsersList(res) as Record<string, unknown>[];
      const mapped = rows
        .filter((u) => u.role === "admin")
        .map((u) => apiRowToRecord(u));
      setAdmins(mapped);
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not load platform admins.";
      setLoadError(msg);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAdmin = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.organizationName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in name, email, password, and organization name.",
        variant: "destructive",
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (admins.some((a) => a.email.toLowerCase() === formData.email.toLowerCase())) {
      toast({
        title: "Validation Error",
        description: "An admin with this email already exists.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const provisioned = await authAPI.provisionPlatformAdmin(
        formData.name.trim(),
        formData.email.toLowerCase(),
        formData.password,
        { tenant_name: formData.organizationName.trim() }
      );

      const record: PlatformAdminRecord = {
        id: provisioned.user.id || String(Date.now()),
        name: provisioned.user.name,
        email: provisioned.user.email,
        status: "active",
        createdAt: new Date().toISOString(),
        tenantId: provisioned.user.tenantId,
        tenantName: provisioned.user.tenantName ?? formData.organizationName.trim(),
      };

      setAdmins((prev) => [record, ...prev]);
      setFormData({ name: "", email: "", password: "", confirmPassword: "", organizationName: "" });
      setCreateDialogOpen(false);

      toast({
        title: "Admin created",
        description: `${record.name} can sign in at /login with the email and password you set, then open /admin.`,
      });

      if (provisioned.roleWarning) {
        toast({
          title: "Role notice",
          description: provisioned.roleWarning,
          variant: "destructive",
        });
      }

      void loadAdmins();
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Failed to create admin.";
      toast({ title: "Could not create admin", description: msg, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await authAPI.toggleUserStatus(parseInt(id, 10));
      if (response?.success) {
        const u = response.data;
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: u.is_active ? "active" : "inactive" } : a
          )
        );
        toast({ title: "Success", description: "Admin status updated." });
      } else {
        throw new Error(response?.message || "Update failed");
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not update admin status.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <motion.div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <motion.div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
        <h1 className="text-2xl font-bold text-foreground">Platform Admins</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage LMS admin accounts ({admins.length} total)
        </p>
      </motion.div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load admins</AlertTitle>
          <AlertDescription className="text-sm">{loadError}</AlertDescription>
        </Alert>
      )}

      <motion.div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 shrink-0">
              <UserPlus className="w-4 h-4 mr-2" />
              Create admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create platform admin</DialogTitle>
              <DialogDescription>
                Creates an account on the LMS server. The new admin signs in at /login, then uses /admin.
              </DialogDescription>
            </DialogHeader>
            <Alert className="mx-6 mb-0">
              <AlertTitle>Super Admin session required</AlertTitle>
              <AlertDescription className="text-xs">
                You must be logged in as superadmin. If creation fails with forbidden or unauthorized, log out and sign in again as your superadmin account.
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 py-4 px-6">
              <div className="grid gap-2">
                <Label htmlFor="sa-name">Full name</Label>
                <Input
                  id="sa-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Admin full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sa-email">Email</Label>
                <Input
                  id="sa-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sa-org">Organization name</Label>
                <Input
                  id="sa-org"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="e.g. Kalpana Institute"
                />
                <p className="text-xs text-muted-foreground">
                  Creates a separate tenant. This admin only sees their org&apos;s instructors, students, and courses.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sa-password">Password</Label>
                <Input
                  id="sa-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Secure password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sa-confirm">Confirm password</Label>
                <Input
                  id="sa-confirm"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                />
              </div>
            </div>
            <motion.div className="flex justify-end gap-3 px-6 pb-6">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreateAdmin()} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create admin"}
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Admin</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Organization</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Created</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Active</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {loadError ? "Fix the error above and refresh the page." : "No platform admins yet. Create one to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                          {a.name.charAt(0)}
                        </div>
                        <div>
                          <Link
                            to={`/superadmin/admins/${a.id}`}
                            className="text-sm font-medium text-foreground flex items-center gap-1.5 hover:text-primary hover:underline"
                          >
                            {a.name}
                            <Shield className="w-3.5 h-3.5 text-primary" />
                          </Link>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{formatTenantLabel(a.tenantName)}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{formatCreatedAt(a.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Switch
                        checked={a.status === "active"}
                        onCheckedChange={() => void handleToggleStatus(a.id)}
                        disabled={user?.email === a.email}
                        title={user?.email === a.email ? "Cannot deactivate your own account" : undefined}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <Button asChild variant="outline" size="sm" className="gap-1">
                        <Link to={`/superadmin/admins/${a.id}`}>
                          <Users className="w-3.5 h-3.5" />
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default SuperAdminAdmins;
