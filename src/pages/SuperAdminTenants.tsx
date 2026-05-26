import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { authAPI, formatApiErrorMessage, normalizeTenantsList, readHttpStatus } from "@/services/api";
import type { TenantRecord } from "@/data/superAdminData";
import { getDisplayTenantName } from "@/utils/tenant";
import { ArrowLeft, Building2, Plus } from "lucide-react";

function mapTenant(row: Record<string, unknown>): TenantRecord {
  const raw = String(row.name ?? "").trim();
  const display = getDisplayTenantName(raw);
  return {
    id: String(row.id ?? ""),
    name: display ?? (raw || "Unnamed organization"),
    isActive: row.is_active !== false && row.is_active !== 0,
    createdAt: row.created_at != null ? String(row.created_at) : undefined,
  };
}

const SuperAdminTenants = () => {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authAPI.listTenants({ limit: 200 });
      const rows = normalizeTenantsList(res) as Record<string, unknown>[];
      setTenants(rows.map(mapTenant));
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not load organizations.";
      setLoadError(msg);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Enter an organization name.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await authAPI.createTenant(name.trim());
      setName("");
      setDialogOpen(false);
      toast({ title: "Organization created", description: `"${name.trim()}" is ready for a platform admin.` });
      void loadTenants();
    } catch (error) {
      const msg =
        error instanceof Error
          ? formatApiErrorMessage(error.message, readHttpStatus(error))
          : "Could not create organization.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
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
      <motion.div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground">
            <Link to="/superadmin">
              <ArrowLeft className="h-4 w-4" />
              Platform dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Tenants on the platform ({tenants.length} total). Each org has its own admins, courses, and users.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                Add a tenant, then assign a platform admin to it from Platform Admins.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="tenant-name">Organization name</Label>
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Learning"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>API not ready</AlertTitle>
          <AlertDescription className="text-sm">
            {loadError} Organizations can still be created when adding a platform admin (organization name field).
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Organization</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No organizations listed yet. Create one here or when adding a platform admin.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{t.id}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.isActive !== false ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {t.isActive !== false ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default SuperAdminTenants;
