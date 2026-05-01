import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Search, Users, Loader2, Globe } from "lucide-react";
import { authAPI, courseAPI, moduleAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
    active: "bg-success/10 text-success",
    draft: "bg-warning/10 text-warning",
    archived: "bg-muted text-muted-foreground",
};

interface CourseItem {
    id: string;
    title: string;
    category: string;
    description: string;
    thumbnail: string;
    studentCount: number;
    avgProgress: number;
    status: "active" | "draft" | "archived";
    approval_status?: "pending" | "approved" | "rejected";
    modules: { id: string; title: string; lessons: number }[];
}

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";

const InstructorCourses = () => {
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [courses, setCourses] = useState<CourseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [publishingId, setPublishingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                setError(null);
                const profileRes = await authAPI.getProfile();
                const userId = profileRes?.data?.id;
                if (!userId || profileRes?.data?.role !== "instructor") {
                    setCourses([]);
                    return;
                }
                const coursesRes = await courseAPI.getAllCourses({ instructor_id: userId, limit: 100 });
                const instructorCourses = coursesRes?.data ?? [];
                const mapped: CourseItem[] = await Promise.all(
                    instructorCourses.map(async (c: Record<string, unknown>) => {
                        const courseId = String(c.id);
                        let modules: { id: string; title: string; lessons: number }[] = [];
                        try {
                            const modsRes = await moduleAPI.getModulesByCourse(courseId);
                            const mods = modsRes?.data ?? [];
                            modules = Array.isArray(mods)
                                ? mods.map((m: { id: number; title: string; lessons?: unknown[] }) => ({
                                    id: String(m.id),
                                    title: m.title ?? "",
                                    lessons: Array.isArray(m.lessons) ? m.lessons.length : 0,
                                  }))
                                : [];
                        } catch {
                            modules = [];
                        }
                        return {
                            id: courseId,
                            title: String(c.title ?? ""),
                            category: String(c.category ?? "Development"),
                            description: String(c.description ?? ""),
                            thumbnail: (c.thumbnail as string) || DEFAULT_THUMBNAIL,
                            studentCount: Number((c as { enrolled_count?: number }).enrolled_count ?? 0),
                            avgProgress: 0,
                            status: (c.is_active === true || c.is_active === 1 ? "active" : "draft") as "active" | "draft",
                            approval_status: (c as { approval_status?: string }).approval_status || "pending",
                            modules,
                        };
                    })
                );
                setCourses(mapped);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load courses");
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const filtered = courses.filter(c =>
        (statusFilter === "all" || c.status === statusFilter) &&
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    const handlePublish = async (e: React.MouseEvent, courseId: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            setPublishingId(courseId);
            await courseAPI.publishCourse(courseId);
            setCourses(courses.map(c => c.id === courseId ? { ...c, status: "active" as const } : c));
            toast({ title: "Course published", description: "Your course is now live." });
        } catch (err) {
            toast({ title: "Failed to publish", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
        } finally {
            setPublishingId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-7xl">
                <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
                    <p className="text-muted-foreground mt-1">Manage your courses and content</p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-4 border border-destructive/20">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "active", "draft", "archived"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Cards */}
            {filtered.length === 0 ? (
                <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
                    <p className="text-muted-foreground">
                        {courses.length === 0
                            ? "No courses assigned to you yet. Contact your admin to get assigned to courses."
                            : "No courses found matching your filters."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((course) => (
                        <div key={course.id}>
                            <Link to={`/instructor/course/${course.id}`} className="group block">
                                <div className="bg-card rounded-xl overflow-hidden border border-border shadow-card hover:shadow-elevated transition-all duration-300">
                                    <div className="h-40 overflow-hidden relative">
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${statusColors[course.status]}`}>
                                                {course.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <span className="text-xs font-semibold text-accent uppercase tracking-wide">{course.category}</span>
                                        <div className="flex items-start justify-between gap-2 mt-1.5">
                                            <h3 className="text-base font-semibold text-foreground flex-1">{course.title}</h3>
                                            {course.status === "draft" && (
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${
                                                    course.approval_status === "approved" 
                                                        ? "bg-success/20 text-success" 
                                                        : course.approval_status === "rejected"
                                                        ? "bg-destructive/20 text-destructive"
                                                        : "bg-warning/20 text-warning"
                                                }`}>
                                                    {course.approval_status === "rejected" ? "Rejected" : course.approval_status === "approved" ? "Approved" : "Pending"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{course.studentCount.toLocaleString()} students</span>
                                            <span>·</span>
                                            <span>{course.modules.length} modules</span>
                                        </div>
                                        {course.status === "active" && (
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">Avg. Progress</span>
                                                    <span className="font-semibold text-foreground">{course.avgProgress}%</span>
                                                </div>
                                                <Progress value={course.avgProgress} className="h-2" />
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-4">
                                            {course.status === "draft" && (
                                                <Button
                                                    size="sm"
                                                    className="gap-1.5 flex-1"
                                                    onClick={(e) => handlePublish(e, course.id)}
                                                    disabled={publishingId === course.id || course.approval_status !== "approved"}
                                                    title={course.approval_status !== "approved" ? "Course must be approved by admin first" : "Publish your course"}
                                                >
                                                    <Globe className="w-3.5 h-3.5" /> {publishingId === course.id ? "Publishing..." : "Publish"}
                                                </Button>
                                            )}
                                            <Button
                                                className={course.status === "draft" ? "flex-1" : "w-full"}
                                                size="sm"
                                                variant={course.status === "draft" ? "outline" : "default"}
                                            >
                                                {course.status === "draft" ? "Edit Draft" : "Manage Course"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InstructorCourses;
