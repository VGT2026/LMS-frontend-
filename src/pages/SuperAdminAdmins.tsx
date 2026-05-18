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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { authAPI, isSuperAdminApiFallbackError, normalizeUsersList, readHttpStatus } from "@/services/api";
import {
  appendMockPlatformAdmin,
  loadMockPlatformAdmins,
  toggleMockPlatformAdminStatus,
  useMockSuperAdmin,
  type PlatformAdminRecord,
} from "@/data/superAdminMock";
import { Shield, UserPlus, Search, ArrowLeft } from "lucide-react";

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
  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? "Admin"),
    email: String(user.email ?? ""),
    status: user.is_active === false ? "inactive" : "active",
    createdAt: String(user.created_at ?? user.createdAt ?? new Date().toISOString()),
    loginReady: true,
  };
}

const SuperAdminAdmins = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const mockMode = useMockSuperAdmin();

  const [admins, setAdmins] = useState<PlatformAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [usingMockFallback, setUsingMockFallback] = useState(mockMode);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      if (mockMode) {
        setAdmins(loadMockPlatformAdmins());
        setUsingMockFallback(true);
        return;
      }

      try {
        const res = await authAPI.listAdmins();
        const rows = normalizeUsersList(res) as Record<string, unknown>[];
        const mapped = rows
          .filter((u) => u.role === "admin")
          .map((u) => apiRowToRecord(u));
        if (mapped.length > 0) {
          setAdmins(mapped);
          setUsingMockFallback(false);
        } else {
          setAdmins(loadMockPlatformAdmins());
          setUsingMockFallback(true);
        }
      } catch (apiErr) {
        console.warn("listAdmins failed, using mock storage:", apiErr);
        setAdmins(loadMockPlatformAdmins());
        setUsingMockFallback(true);
      }
    } finally {
      setLoading(false);
    }
  }, [mockMode]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAdmin = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
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
        formData.password
      );

      const record: PlatformAdminRecord = {
        id: provisioned.user.id || String(Date.now()),
        name: provisioned.user.name,
        email: provisioned.user.email,
        status: "active",
        createdAt: new Date().toISOString(),
        loginReady: true,
      };

      setAdmins((prev) => [record, ...prev]);
      setUsingMockFallback(false);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setCreateDialogOpen(false);

      toast({
        title: "Admin can log in",
        description: `${record.name} was created on the server. They sign in at /login with the email and password you set, then open /admin.`,
      });

      if (provisioned.roleWarning) {
        toast({
          title: "Role notice",
          description: provisioned.roleWarning,
          variant: "destructive",
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create admin";
      const status = readHttpStatus(error);

      if (isSuperAdminApiFallbackError(error) || status === 403) {
        const record = appendMockPlatformAdmin({
          name: formData.name.trim(),
          email: formData.email.toLowerCase(),
        });
        setAdmins((prev) => [record, ...prev]);
        setUsingMockFallback(true);
        setFormData({ name: "", email: "", password: "", confirmPassword: "" });
        setCreateDialogOpen(false);
        toast({
          title: "Demo list only — cannot log in",
          description:
            "Sign in as superadmin first, then create again. Demo-only rows are not real accounts. Log out and log in as superadmin@lmspro.com (or fix API permissions).",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (mockMode || usingMockFallback) {
      const updated = toggleMockPlatformAdminStatus(id);
      setAdmins(updated);
      toast({ title: "Status updated", description: "Mock admin status changed." });
      return;
    }

    try {
      const response = await authAPI.toggleUserStatus(parseInt(id, 10));
      if (response?.success) {
        const u = response.data;
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: u.is_active ? "active" : "inactive" }
              : a
          )
        );
        toast({ title: "Success", description: "Admin status updated." });
      } else {
        throw new Error(response?.message || "Update failed");
      }
    } catch {
      const updated = toggleMockPlatformAdminStatus(id);
      setAdmins(updated);
      setUsingMockFallback(true);
      toast({
        title: "Saved locally",
        description: "API unavailable — status updated in demo storage.",
      });
    }
  };

  if (loading) {
    return (
      <motion.div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
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
        </div>
        {usingMockFallback && (
          <Badge variant="outline" className="text-xs">
            Demo / mock data
          </Badge>
        )}
      </div>

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
                Creates a real account on the LMS server. The new admin signs in at /login with this email and password, then uses /admin.
              </DialogDescription>
            </DialogHeader>
            <Alert className="mx-6 mb-0">
              <AlertTitle>You must be signed in as Super Admin</AlertTitle>
              <AlertDescription className="text-xs">
                Creating an admin here calls the API (not browser demo storage). If you only see “demo” toasts, log in as your superadmin user first, then create again.
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Created</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Login</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No platform admins yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <motion.div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                          {a.name.charAt(0)}
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {a.name}
                            <Shield className="w-3.5 h-3.5 text-primary" />
                          </p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                    </td>
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
                      {a.loginReady !== false ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Can sign in
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          Demo only
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Switch
                        checked={a.status === "active"}
                        onCheckedChange={() => void handleToggleStatus(a.id)}
                        disabled={user?.email === a.email}
                        title={user?.email === a.email ? "Cannot deactivate your own account" : undefined}
                      />
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
