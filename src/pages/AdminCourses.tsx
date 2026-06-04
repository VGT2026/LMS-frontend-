import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI, courseAPI, normalizeCoursesList, normalizeTenantsList } from "@/services/api";
import { getCourseThumbnail } from "@/utils/course";
import {
  getDisplayTenantName,
  scopeRowsToTenant,
  groupRowsByOrganization,
  formatTenantLabel,
  getTenantKeyFromRow,
} from "@/utils/tenant";
import {
  BookOpen,
  Search,
  Users,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Settings,
  Pencil,
  PlusCircle,
  XCircle,
  Building2,
} from "lucide-react";

interface OrgOption {
    id: string;
    name: string;
}

interface Instructor {
    id: number;
    name: string;
    email: string;
    is_active?: boolean;
}

interface CourseRow {
    id: number;
    title: string;
    description?: string;
    category: string;
    instructor_id?: number;
    instructor?: string;
    thumbnail?: string;
    is_active?: boolean;
    approval_status?: "pending" | "approved" | "rejected";
    students?: number;
    revenue?: number;
    tenantId?: string;
    organizationLabel: string;
}

function mapApiToCourseRow(raw: Record<string, unknown>): CourseRow {
    const nested =
        raw.tenant && typeof raw.tenant === "object" && !Array.isArray(raw.tenant)
            ? (raw.tenant as Record<string, unknown>)
            : undefined;
    const rawOrgName = raw.tenant_name ?? raw.tenantName ?? nested?.name;
    const { tenantId } = getTenantKeyFromRow(raw);
    return {
        id: Number(raw.id),
        title: String(raw.title ?? ""),
        description: raw.description != null ? String(raw.description) : undefined,
        category: String(raw.category ?? ""),
        instructor_id: raw.instructor_id != null ? Number(raw.instructor_id) : undefined,
        instructor: raw.instructor != null ? String(raw.instructor) : undefined,
        thumbnail: raw.thumbnail != null ? String(raw.thumbnail) : undefined,
        is_active: raw.is_active === true || raw.is_active === 1,
        approval_status: raw.approval_status as CourseRow["approval_status"],
        students: raw.students != null ? Number(raw.students) : undefined,
        revenue: raw.revenue != null ? Number(raw.revenue) : undefined,
        tenantId,
        organizationLabel: (() => {
            const label = formatTenantLabel(rawOrgName != null ? String(rawOrgName) : undefined);
            if (label !== "—") return label;
            if (tenantId) return `Organization #${tenantId}`;
            return "Unassigned";
        })(),
    };
}

const PREDEFINED_CATEGORIES = ["Development", "Data Science", "Design", "Business", "Security", "Cloud & DevOps"];

const AdminCoursesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const isSuperadmin = user?.role === "superadmin";
    const orgName = getDisplayTenantName(user?.tenantName);
    const [coursesData, setCoursesData] = useState<CourseRow[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [orgFilter, setOrgFilter] = useState("all");
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<CourseRow | null>(null);
    const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
    const [editForm, setEditForm] = useState({ title: "", description: "", category: "", instructorId: "", thumbnail: "" });
    const [saving, setSaving] = useState(false);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState("");
    const [categories, setCategories] = useState<string[]>(PREDEFINED_CATEGORIES);
    const [approvingCourseId, setApprovingCourseId] = useState<number | null>(null);
    const [organizations, setOrganizations] = useState<OrgOption[]>([]);

    const showOrgColumn = isSuperadmin && orgFilter === "all";
    const groupByOrganization = isSuperadmin && orgFilter === "all";
    const colSpan = showOrgColumn ? 6 : 5;

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const params: {
                limit: number;
                include_inactive?: boolean;
                tenant_id?: string | number;
            } = { limit: 500, include_inactive: true };

            if (isSuperadmin) {
                if (orgFilter !== "all") params.tenant_id = orgFilter;
            } else if (user?.tenantId) {
                params.tenant_id = user.tenantId;
            }

            const response = await courseAPI.getAllCoursesWithRetries(params);
            const list = normalizeCoursesList(response);
            const mapped = Array.isArray(list)
                ? (list as Record<string, unknown>[]).map(mapApiToCourseRow)
                : [];

            if (!isSuperadmin && user) {
                const scoped = scopeRowsToTenant(
                    mapped as unknown as Record<string, unknown>[],
                    user.tenantId,
                    user.tenantName
                );
                setCoursesData(scoped.rows.map((r) => mapApiToCourseRow(r)));
            } else {
                setCoursesData(mapped);
            }
        } catch (error) {
            console.error("Failed to fetch courses:", error);
            const msg = error instanceof Error ? error.message : "Failed to load courses";
            toast({
                title: "Could not load courses",
                description: msg,
                variant: "destructive",
            });
            setCoursesData([]);
        } finally {
            setLoading(false);
        }
    }, [isSuperadmin, orgFilter, user?.tenantId, user?.tenantName, toast]);

    const fetchOrganizations = useCallback(async () => {
        if (!isSuperadmin) {
            setOrganizations([]);
            return;
        }
        try {
            const res = await authAPI.listTenants({ limit: 200 });
            const rows = normalizeTenantsList(res) as Record<string, unknown>[];
            setOrganizations(
                rows.map((t) => ({
                    id: String(t.id ?? ""),
                    name: formatTenantLabel(String(t.name ?? "")) || String(t.name ?? "Organization"),
                }))
            );
        } catch {
            setOrganizations([]);
        }
    }, [isSuperadmin]);

    const fetchInstructors = useCallback(async () => {
        try {
            const list = await authAPI.fetchInstructorsList();
            const raw = Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
            const scoped = isSuperadmin
                ? raw
                : scopeRowsToTenant(raw, user?.tenantId, user?.tenantName).rows;
            const active = scoped
                .map((i) => ({
                    id: Number(i.id),
                    name: String(i.name ?? ""),
                    email: String(i.email ?? ""),
                    is_active: i.is_active !== false && i.is_active !== 0,
                }))
                .filter((i) => i.id && i.is_active !== false) as Instructor[];
            setInstructors(active);
        } catch (error) {
            console.error("Failed to fetch instructors:", error);
            setInstructors([]);
        }
    }, [isSuperadmin, user?.tenantId, user?.tenantName]);

    useEffect(() => {
        void fetchOrganizations();
    }, [fetchOrganizations]);

    useEffect(() => {
        void fetchCourses();
        void fetchInstructors();
    }, [fetchCourses, fetchInstructors]);

    useEffect(() => {
        if (!isSuperadmin || organizations.length > 0) return;
        const fromCourses = new Map<string, string>();
        for (const c of coursesData) {
            if (c.tenantId && c.organizationLabel && c.organizationLabel !== "—") {
                fromCourses.set(c.tenantId, c.organizationLabel);
            }
        }
        if (fromCourses.size > 0) {
            setOrganizations(
                [...fromCourses.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
            );
        }
    }, [coursesData, isSuperadmin, organizations.length]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await courseAPI.getCategories?.();
                const fetchedCategories = Array.isArray(response?.data) ? response.data : [];
                if (fetchedCategories.length > 0) {
                    setCategories(fetchedCategories);
                } else {
                    setCategories(PREDEFINED_CATEGORIES);
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error);
                setCategories(PREDEFINED_CATEGORIES);
            }
        };
        fetchCategories();
    }, []);

    const filtered = useMemo(() => {
        return coursesData.filter((c) => {
            const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase());
            const status = c.is_active ? "active" : "inactive";
            const matchesFilter = filter === "all" || status === filter;
            return matchesSearch && matchesFilter;
        });
    }, [coursesData, search, filter]);

    const coursesByOrganization = useMemo(
        () =>
            groupRowsByOrganization(
                filtered as unknown as Record<string, unknown>[],
                (row) => (row as unknown as CourseRow).organizationLabel
            ),
        [filtered]
    );

    const toggleCourse = async (course: CourseRow) => {
        try {
            const response = await courseAPI.toggleCourseStatus(course.id.toString());
            if (response.success) {
                const nextActive = !!response.data?.is_active;
                setCoursesData((prev) =>
                    prev.map((c) =>
                        c.id === course.id
                            ? {
                                  ...c,
                                  is_active: nextActive,
                                  approval_status: nextActive ? "approved" : "rejected",
                              }
                            : c
                    )
                );
                toast({ title: "Success", description: `Course ${response.data?.is_active ? "activated" : "deactivated"}` });
            } else throw new Error(response.message);
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    };

    const handleApproveCourse = async (courseId: number, status: 'approved' | 'rejected') => {
        try {
            setApprovingCourseId(courseId);
            const response = await courseAPI.approveCourse(courseId.toString(), status);
            if (response.success) {
                setCoursesData((prev) =>
                    prev.map((c) =>
                        c.id === courseId
                            ? { ...c, approval_status: status }
                            : c
                    )
                );
                const message = status === 'approved' 
                    ? 'Course approved. Instructor can now add modules and publish.'
                    : 'Course rejected. Instructor will be notified.';
                toast({ title: "Success", description: message });
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setApprovingCourseId(null);
        }
    };

    const openAssignmentDialog = (course: CourseRow) => {
        setSelectedCourse(course);
        setSelectedInstructorId(course.instructor_id?.toString() ?? "unassigned");
        setAssignmentDialogOpen(true);
    };

    const assignInstructor = async () => {
        if (!selectedCourse) return;
        try {
            const instructorId = selectedInstructorId === "unassigned" ? null : parseInt(selectedInstructorId);
            const response = await courseAPI.assignInstructor(selectedCourse.id.toString(), instructorId);
            if (response.success) {
                const inst = instructorId ? instructors.find((i) => i.id === instructorId) : null;
                setCoursesData(coursesData.map((c) => (c.id === selectedCourse.id ? { ...c, instructor: inst?.name ?? "Unassigned", instructor_id: instructorId ?? undefined } : c)));
                setAssignmentDialogOpen(false);
                setSelectedCourse(null);
                toast({ title: "Success", description: "Instructor assigned" });
            } else throw new Error(response.message);
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    };

    const openEditDialog = (course: CourseRow) => {
        setSelectedCourse(course);
        setEditForm({
            title: course.title ?? "",
            description: course.description ?? "",
            category: course.category ?? "",
            instructorId: course.instructor_id?.toString() ?? "",
            thumbnail: getCourseThumbnail(course as unknown as Record<string, unknown>) ?? "",
        });
        setEditDialogOpen(true);
    };

    const saveEdit = async () => {
        if (!selectedCourse || !editForm.title || !editForm.category || !editForm.instructorId) {
            toast({ title: "Missing fields", description: "Title, category, and instructor are required.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const response = await courseAPI.updateCourse(selectedCourse.id.toString(), {
                title: editForm.title.trim(),
                description: editForm.description.trim() || undefined,
                category: editForm.category,
                instructor_id: parseInt(editForm.instructorId),
                thumbnail: editForm.thumbnail.trim() || undefined,
            });
            if (response.success) {
                const inst = instructors.find((i) => i.id.toString() === editForm.instructorId);
                setCoursesData(coursesData.map((c) => (c.id === selectedCourse.id ? { ...c, ...response.data, instructor: inst?.name } : c)));
                setEditDialogOpen(false);
                setSelectedCourse(null);
                toast({ title: "Success", description: "Course updated" });
            } else throw new Error(response.message);
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const placeholderImg = "https://placehold.co/80x60?text=Course";

    const renderCourseRow = (c: CourseRow) => (
        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
            <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                    <img
                        src={getCourseThumbnail(c as unknown as Record<string, unknown>) || placeholderImg}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-muted"
                    />
                    <span className="text-sm font-medium text-foreground">{c.title}</span>
                </div>
            </td>
            <td className="px-5 py-3 text-sm text-muted-foreground">{c.category}</td>
            <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{c.instructor || "Unassigned"}</span>
                </div>
            </td>
            <td className="px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                        {c.is_active ? "active" : "inactive"}
                    </span>
                    {c.approval_status && (
                        <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                c.approval_status === "approved"
                                    ? "bg-success/10 text-success"
                                    : c.approval_status === "rejected"
                                      ? "bg-destructive/10 text-destructive"
                                      : "bg-warning/10 text-warning"
                            }`}
                        >
                            {c.approval_status === "rejected"
                                ? "Rejected"
                                : c.approval_status === "approved"
                                  ? "Approved"
                                  : "Pending"}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-5 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                    {c.approval_status === "pending" && (
                        <>
                            <button
                                onClick={() => handleApproveCourse(c.id, "approved")}
                                disabled={approvingCourseId === c.id}
                                className="text-success hover:text-success/80 p-1.5 rounded-lg hover:bg-success/10 transition-colors disabled:opacity-50"
                                title="Approve course"
                            >
                                <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleApproveCourse(c.id, "rejected")}
                                disabled={approvingCourseId === c.id}
                                className="text-destructive hover:text-destructive/80 p-1.5 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                title="Reject course"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => openEditDialog(c)}
                        className="text-muted-foreground hover:text-accent p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Edit course"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => openAssignmentDialog(c)}
                        className="text-muted-foreground hover:text-accent p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Assign Instructor"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => toggleCourse(c)}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Toggle status"
                    >
                        {c.is_active ? (
                            <ToggleRight className="w-4 h-4 text-success" />
                        ) : (
                            <ToggleLeft className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </td>
        </tr>
    );

    const tableHeader = (
        <thead>
            <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Course</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Instructor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
        </thead>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manage Courses</h1>
                    <p className="text-muted-foreground mt-1">
                      {isSuperadmin
                        ? orgFilter === "all"
                          ? `${filtered.length} courses across ${coursesByOrganization.length} organization(s)`
                          : `${filtered.length} courses in ${organizations.find((o) => o.id === orgFilter)?.name ?? "selected organization"}`
                        : orgName
                          ? `${filtered.length} courses in ${orgName}`
                          : `${filtered.length} courses in your organization`}
                    </p>
                </div>
                <Button asChild className="gap-1.5">
                    <Link to="/admin/create-course">
                        <PlusCircle className="w-4 h-4" /> Create Course
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Active Courses", value: coursesData.filter((c) => c.is_active).length, icon: BookOpen, color: "text-primary bg-primary/10" },
                    { label: "Total Courses", value: coursesData.length, icon: Users, color: "text-accent bg-accent/10" },
                    { label: "Categories", value: new Set(coursesData.map((c) => c.category)).size, icon: TrendingUp, color: "text-success bg-success/10" },
                ].map((s) => (
                    <div key={s.label} className="bg-card rounded-xl p-5 border border-border shadow-card flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{s.label}</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}><s.icon className="w-5 h-5" /></div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                {isSuperadmin && organizations.length > 0 && (
                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                        <SelectTrigger className="w-52">
                            <SelectValue placeholder="Organization" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All organizations</SelectItem>
                            {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                    {org.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {showGroupedByOrg ? (
                <div className="space-y-6">
                    {loading ? (
                        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                            Loading courses…
                        </div>
                    ) : coursesByOrganization.length === 0 ? (
                        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                            No courses found
                        </div>
                    ) : (
                        coursesByOrganization.map((group) => (
                            <div
                                key={group.key}
                                className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
                            >
                                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-primary" />
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {group.label}
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        ({group.rows.length} course{group.rows.length === 1 ? "" : "s"})
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        {tableHeader}
                                        <tbody className="divide-y divide-border">
                                            {(group.rows as unknown as CourseRow[]).map((c) =>
                                                renderCourseRow(c)
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            {tableHeader}
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={colSpan} className="px-5 py-8 text-center text-muted-foreground">
                                            Loading courses…
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={colSpan} className="px-5 py-8 text-center text-muted-foreground">
                                            No courses found
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((c) => renderCourseRow(c))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Assign Instructor Dialog */}
            <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Assign Instructor</DialogTitle>
                        <DialogDescription>Assign an instructor to &quot;{selectedCourse?.title}&quot;</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Select Instructor</Label>
                            <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
                                <SelectTrigger><SelectValue placeholder="Choose an instructor" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {instructors.map((inst) => (
                                        <SelectItem key={inst.id} value={inst.id.toString()}>{inst.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={assignInstructor} disabled={!selectedInstructorId}>Assign Instructor</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Course Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                        <DialogDescription>Update course details for &quot;{selectedCourse?.title}&quot;</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Course Title *</Label>
                            <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} placeholder="Course title" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Category *</Label>
                            {editForm.category && !categories.includes(editForm.category) ? (
                                // Custom category selected - show it with option to change
                                <div className="flex gap-2">
                                    <div className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground">
                                        {editForm.category}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setShowCustomCategory(true);
                                            setCustomCategory(editForm.category);
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>
                            ) : showCustomCategory ? (
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Enter new category" 
                                        value={customCategory} 
                                        onChange={e => setCustomCategory(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            if (customCategory.trim()) {
                                                const trimmedCat = customCategory.trim();
                                                setEditForm((f) => ({ ...f, category: trimmedCat }));
                                                // Add to categories list if not already there
                                                if (!categories.includes(trimmedCat)) {
                                                    setCategories([...categories, trimmedCat]);
                                                }
                                                setShowCustomCategory(false);
                                                setCustomCategory("");
                                            } else {
                                                toast({ title: "Error", description: "Category cannot be empty", variant: "destructive" });
                                            }
                                        }}
                                    >
                                        Add
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                            setShowCustomCategory(false);
                                            setCustomCategory("");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Select value={editForm.category} onValueChange={(value) => {
                                    if (value === "__other__") {
                                        setShowCustomCategory(true);
                                    } else {
                                        setEditForm((f) => ({ ...f, category: value }));
                                    }
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                        <SelectItem value="__other__">Other (Add custom)</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Course description" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Instructor *</Label>
                            <Select value={editForm.instructorId || "__select__"} onValueChange={(v) => v !== "__select__" && setEditForm((f) => ({ ...f, instructorId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__select__" disabled>Select instructor</SelectItem>
                                    {instructors.map((inst) => (
                                        <SelectItem key={inst.id} value={inst.id.toString()}>{inst.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Thumbnail URL (optional)</Label>
                            <Input value={editForm.thumbnail} onChange={(e) => setEditForm((f) => ({ ...f, thumbnail: e.target.value }))} placeholder="https://..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={saving || !editForm.title || !editForm.category || !editForm.instructorId}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default AdminCoursesPage;
