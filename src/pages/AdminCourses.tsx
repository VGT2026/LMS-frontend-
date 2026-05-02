import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authAPI, courseAPI, normalizeCoursesList } from "@/services/api";
import { BookOpen, Search, Users, TrendingUp, ToggleLeft, ToggleRight, UserCheck, Settings, Pencil, PlusCircle, XCircle } from "lucide-react";

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
}

const PREDEFINED_CATEGORIES = ["Development", "Data Science", "Design", "Business", "Security", "Cloud & DevOps"];

const AdminCoursesPage = () => {
    const { toast } = useToast();
    const [coursesData, setCoursesData] = useState<CourseRow[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
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

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await courseAPI.getAllCoursesWithRetries({ limit: 100 });
            const list = normalizeCoursesList(response);
            setCoursesData(Array.isArray(list) ? (list as CourseRow[]) : []);
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
    };

    const fetchInstructors = async () => {
        try {
            const response = await authAPI.getAllUsers({ role: "instructor", limit: 100 });
            const list = response?.data ?? [];
            const active = Array.isArray(list) ? list.filter((i: Instructor) => i.is_active !== false) : [];
            setInstructors(active);
        } catch (error) {
            console.error("Failed to fetch instructors:", error);
            setInstructors([]);
        }
    };

    useEffect(() => {
        fetchCourses();
        fetchInstructors();
    }, []);

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

    const filtered = coursesData.filter((c) => {
        const matchesSearch = c.title?.toLowerCase().includes(search.toLowerCase());
        const status = c.is_active ? "active" : "inactive";
        const matchesFilter = filter === "all" || status === filter;
        return matchesSearch && matchesFilter;
    });

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
            thumbnail: course.thumbnail ?? "",
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

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manage Courses</h1>
                    <p className="text-muted-foreground mt-1">{coursesData.length} total courses</p>
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
            </div>

            {/* Course table */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Course</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Instructor</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Loading courses...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No courses found</td></tr>
                            ) : (
                                filtered.map((c) => (
                                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <img src={c.thumbnail || placeholderImg} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" />
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
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{c.is_active ? "active" : "inactive"}</span>
                                                {c.approval_status && (
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        c.approval_status === "approved" ? "bg-success/10 text-success" :
                                                        c.approval_status === "rejected" ? "bg-destructive/10 text-destructive" :
                                                        "bg-warning/10 text-warning"
                                                    }`}>
                                                        {c.approval_status === "rejected" ? "Rejected" : c.approval_status === "approved" ? "Approved" : "Pending"}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {c.approval_status === "pending" && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleApproveCourse(c.id, 'approved')} 
                                                            disabled={approvingCourseId === c.id}
                                                            className="text-success hover:text-success/80 p-1.5 rounded-lg hover:bg-success/10 transition-colors disabled:opacity-50" 
                                                            title="Approve course"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleApproveCourse(c.id, 'rejected')} 
                                                            disabled={approvingCourseId === c.id}
                                                            className="text-destructive hover:text-destructive/80 p-1.5 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50" 
                                                            title="Reject course"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => openEditDialog(c)} className="text-muted-foreground hover:text-accent p-1.5 rounded-lg hover:bg-muted transition-colors" title="Edit course">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openAssignmentDialog(c)} className="text-muted-foreground hover:text-accent p-1.5 rounded-lg hover:bg-muted transition-colors" title="Assign Instructor">
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => toggleCourse(c)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors" title="Toggle status">
                                                    {c.is_active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
