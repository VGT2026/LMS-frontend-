import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/services/api";
import { Users, UserCheck, UserX, Search, Shield, GraduationCap, BookOpen, UserPlus } from "lucide-react";

const roleIcons: Record<string, typeof Shield> = { admin: Shield, instructor: GraduationCap, student: BookOpen };

const AdminUsersPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [usersData, setUsersData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    // Fetch users from API on component mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await authAPI.getAllUsers({ limit: 1000 });
                if (response.success && response.data) {
                    // Transform API response to match frontend expectations
                    const transformedUsers = response.data.map((user: any) => ({
                        id: user.id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        status: user.is_active ? "active" : "inactive",
                        enrolled: Number(user.enrolled ?? 0),
                        avatar: user.avatar,
                    }));
                    setUsersData(transformedUsers);
                } else {
                    toast({
                        title: "Error",
                        description: "Failed to load users",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
                toast({
                    title: "Error",
                    description: "Failed to load users",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [toast]);

    const filtered = usersData.filter(u => {
        const matchSearch = (u.name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === "all" || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const toggleStatus = async (id: string) => {
        try {
            const response = await authAPI.toggleUserStatus(parseInt(id));
            if (response.success) {
                // Transform API response and update local state
                const updated = response.data;
                const transformedUser = {
                    id: updated.id?.toString() || id,
                    name: updated.name,
                    email: updated.email,
                    role: updated.role,
                    status: updated.is_active ? "active" : "inactive",
                    enrolled: usersData.find((u) => String(u.id) === String(id))?.enrolled ?? 0,
                    avatar: updated.avatar,
                };
                setUsersData(usersData.map(u => u.id === id || u.id === id.toString() ? { ...u, ...transformedUser } : u));
                toast({
                    title: "Success",
                    description: "User status updated. Inactive users can no longer access their account.",
                });
            } else {
                throw new Error(response.message || "Failed to update user status");
            }
        } catch (error) {
            console.error('Toggle status error:', error);
            toast({
                title: "Error",
                description: "Failed to update user status",
                variant: "destructive",
            });
        }
    };

    const handleCreateInstructor = async () => {
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

        // Check if email already exists locally (basic check)
        if (usersData.some(u => u.email === formData.email)) {
            toast({
                title: "Validation Error",
                description: "An account with this email already exists.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);

        try {
            // Call the actual API to create instructor
            const response = await authAPI.createInstructor(
                formData.name.trim(),
                formData.email.toLowerCase(),
                formData.password
            );

            if (response.success) {
                // Transform the new instructor to match frontend expectations
                const newInstructor = {
                    id: response.data.instructor?.id?.toString() || response.data.id?.toString(),
                    name: response.data.instructor?.name || formData.name.trim(),
                    email: response.data.instructor?.email || formData.email.toLowerCase(),
                    role: "instructor",
                    status: "active",
                    enrolled: 0,
                    avatar: response.data.instructor?.avatar,
                };

                setUsersData([...usersData, newInstructor]);
                setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                setCreateDialogOpen(false);

                toast({
                    title: "Success",
                    description: `Instructor account created for ${newInstructor.name}!`,
                });
            } else {
                throw new Error(response.message || "Failed to create instructor");
            }

        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create instructor account.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading users...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Manage Users</h1>
                <p className="text-muted-foreground mt-1">{usersData.length} registered users</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: usersData.length, icon: Users, color: "text-primary bg-primary/10" },
                    { label: "Students", value: usersData.filter(u => u.role === "student").length, icon: BookOpen, color: "text-accent bg-accent/10" },
                    { label: "Instructors", value: usersData.filter(u => u.role === "instructor").length, icon: GraduationCap, color: "text-warning bg-warning/10" },
                    { label: "Active", value: usersData.filter(u => u.status === "active").length, icon: UserCheck, color: "text-success bg-success/10" },
                ].map(s => (
                    <div key={s.label} className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}><s.icon className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="text-xl font-bold text-foreground">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters and Actions */}
            <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="instructor">Instructors</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                </Select>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-accent hover:bg-accent/90">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Create Instructor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create New Instructor</DialogTitle>
                            <DialogDescription>
                                Add a new instructor account. They will receive login credentials via email.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter instructor's full name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="instructor@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter a secure password"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Confirm the password"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                                disabled={isCreating}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateInstructor}
                                disabled={isCreating}
                            >
                                {isCreating ? "Creating..." : "Create Instructor"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Enrolled</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(u => {
                                const RIcon = roleIcons[u.role] || BookOpen;
                                return (
                                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">{u.name.charAt(0)}</div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground capitalize">
                                                <RIcon className="w-3.5 h-3.5" />
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-foreground">{u.enrolled} courses</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{u.status}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Switch
                                                checked={u.status === "active"}
                                                onCheckedChange={() => toggleStatus(u.id)}
                                                disabled={user?.id === u.id}
                                                title={user?.id === u.id ? "Cannot deactivate your own account" : undefined}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminUsersPage;
