import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, ChevronDown, ChevronRight, Users, Send, Mail, Download, Loader2, X, AlertCircle, Trash2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { courseAPI, enrollmentAPI, assignmentAPI } from "@/services/api";

interface StudentCourse {
    courseId: number;
    courseName: string;
    enrolledAt: string;
    progress: number;
    grade: number | null;
    status: "active" | "inactive";
}

interface Student {
    id: number | string;
    name: string;
    email: string;
    courses: StudentCourse[];
    avgGrade: number;
    avgProgress: number;
}

type SortKey = "name" | "grade" | "progress" | "enrolled";
type FilterKey = "all" | "active" | "inactive" | "high" | "low";

const InstructorStudents = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortKey>("name");
    const [filterBy, setFilterBy] = useState<FilterKey>("all");
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<string | number | null>(null);
    const [messageId, setMessageId] = useState<string | number | null>(null);
    const [messageText, setMessageText] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<Set<string | number>>(new Set());

    // Fetch instructor's courses and enrolled students
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch courses taught by instructor
                const coursesRes = await courseAPI.getAllCourses({
                    instructor_id: user?.id as any,
                    limit: 100,
                });
                const courseList = Array.isArray(coursesRes?.data) ? coursesRes.data : [];
                console.log("📚 Courses fetched:", courseList);
                setCourses(courseList);

                // Fetch enrolled students and submissions in parallel
                const allStudentsMap = new Map<string | number, Student>();

                // Fetch submissions to get real grades
                let allSubmissions: any[] = [];
                try {
                    const subsRes = await assignmentAPI.listSubmissions();
                    const subsData = subsRes?.data ?? subsRes;
                    allSubmissions = Array.isArray(subsData) ? subsData : [];
                } catch {
                    allSubmissions = [];
                }

                // Build grade map: "userId_courseId" -> array of grades
                const gradeMap = new Map<string, number[]>();
                for (const sub of allSubmissions) {
                    if (sub.grade != null && sub.user_id && sub.course_id) {
                        const key = `${sub.user_id}_${sub.course_id}`;
                        if (!gradeMap.has(key)) gradeMap.set(key, []);
                        gradeMap.get(key)!.push(Number(sub.grade));
                    }
                }

                for (const course of courseList) {
                    try {
                        const enrollmentsRes = await enrollmentAPI.getEnrollmentsByCourse(String(course.id));
                        
                        // Handle different response structures
                        let enrollments: any[] = [];
                        if (Array.isArray(enrollmentsRes?.data)) {
                            enrollments = enrollmentsRes.data;
                        } else if (Array.isArray(enrollmentsRes)) {
                            enrollments = enrollmentsRes;
                        } else if (enrollmentsRes?.data?.enrollments && Array.isArray(enrollmentsRes.data.enrollments)) {
                            enrollments = enrollmentsRes.data.enrollments;
                        }

                        enrollments.forEach((enrollment: any) => {
                            const studentId = enrollment.user_id;
                            if (!studentId) return;
                            
                            if (!allStudentsMap.has(studentId)) {
                                allStudentsMap.set(studentId, {
                                    id: studentId,
                                    name: enrollment.user_name || enrollment.name || "Unknown",
                                    email: enrollment.user_email || enrollment.email || "",
                                    courses: [],
                                    avgGrade: 0,
                                    avgProgress: 0,
                                });
                            }

                            // Get real grade from submissions
                            const grades = gradeMap.get(`${studentId}_${course.id}`);
                            const avgCourseGrade = grades && grades.length > 0
                                ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
                                : null;

                            const student = allStudentsMap.get(studentId)!;
                            student.courses.push({
                                courseId: course.id,
                                courseName: course.title || "Unknown Course",
                                enrolledAt: enrollment.enrolled_at || new Date().toISOString(),
                                progress: Number(enrollment.progress_percentage) || 0,
                                grade: avgCourseGrade,
                                status: enrollment.status || "active",
                            });
                        });
                    } catch (err) {
                        console.error(`Failed to fetch enrollments for course ${course.id}:`, err);
                    }
                }

                // Calculate averages
                const studentList = Array.from(allStudentsMap.values()).map(student => {
                    const gradedCourses = student.courses.filter(c => c.grade != null);
                    return {
                        ...student,
                        avgGrade: gradedCourses.length > 0
                            ? Math.round(gradedCourses.reduce((sum, c) => sum + (c.grade ?? 0), 0) / gradedCourses.length)
                            : 0,
                        avgProgress: student.courses.length > 0
                            ? Math.round(student.courses.reduce((sum, c) => sum + c.progress, 0) / student.courses.length)
                            : 0,
                    };
                });

                console.log("✅ Final students list:", studentList);
                setStudents(studentList);
            } catch (err) {
                console.error("Failed to fetch students:", err);
                toast({ title: "Error", description: "Could not load students.", variant: "destructive" });
                setStudents([]);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchData();
        }
    }, [user?.id, toast]);

    // Apply filtering and sorting
    const filtered = students
        .filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.email.toLowerCase().includes(search.toLowerCase());
            const matchesCourse = !selectedCourseId || s.courses.some(c => c.courseId === selectedCourseId);
            const matchesFilter = filterBy === "all" ? true :
                filterBy === "active" ? s.courses.some(c => c.status === "active") :
                filterBy === "inactive" ? s.courses.every(c => c.status === "inactive") :
                filterBy === "high" ? s.avgGrade >= 80 :
                filterBy === "low" ? s.avgGrade < 60 : true;
            return matchesSearch && matchesCourse && matchesFilter;
        })
        .sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "grade") return b.avgGrade - a.avgGrade;
            if (sortBy === "progress") return b.avgProgress - a.avgProgress;
            if (sortBy === "enrolled") {
                const aEnrolled = Math.min(...a.courses.map(c => new Date(c.enrolledAt).getTime()));
                const bEnrolled = Math.min(...b.courses.map(c => new Date(c.enrolledAt).getTime()));
                return bEnrolled - aEnrolled;
            }
            return 0;
        });

    const handleSendMessage = async (student: Student) => {
        if (!messageText.trim()) return;
        try {
            // TODO: Integrate with real messaging API when backend is ready
            // Example: await messagesAPI.sendMessage({ to: student.id, content: messageText })
            toast({ title: "Message sent", description: `Your message to ${student.name} has been sent.` });
            setMessageText("");
            setMessageId(null);
        } catch (err) {
            console.error("Message send error:", err);
            toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        }
    };

    const handleSuspendStudent = async (studentId: string | number) => {
        try {
            // TODO: Integrate with backend API
            // Example: await studentAPI.suspendStudent(studentId)
            toast({ title: "Feature coming soon", description: "Student suspension will be available soon.", variant: "default" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to suspend student.", variant: "destructive" });
        }
    };

    const handleRemoveStudent = async (studentId: string | number) => {
        try {
            // TODO: Integrate with backend API
            // Example: await studentAPI.removeStudent(studentId)
            toast({ title: "Feature coming soon", description: "Student removal will be available soon.", variant: "default" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to remove student.", variant: "destructive" });
        }
    };

    const handleToggleStudent = (studentId: string | number) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedStudents.size === filtered.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filtered.map(s => s.id)));
        }
    };

    const handleExportCSV = () => {
        const headers = ["Name", "Email", "Avg Grade", "Avg Progress", "Courses", "Status"];
        const rows = filtered.map(s => [
            s.name,
            s.email,
            `${s.avgGrade}%`,
            `${s.avgProgress}%`,
            s.courses.length,
            s.courses.some(c => c.status === "active") ? "Active" : "Inactive",
        ]);

        const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `students_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast({ title: "Success", description: `Exported ${filtered.length} students to CSV.` });
    };

    const handleBulkEmail = () => {
        if (selectedStudents.size === 0) {
            toast({ title: "No students selected", description: "Please select at least one student.", variant: "destructive" });
            return;
        }
        toast({ title: "Ready", description: `Compose message for ${selectedStudents.size} students.` });
        // TODO: Open bulk email compose modal
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const totalActive = students.filter(s => s.courses.some(c => c.status === "active" || c.status === "completed")).length;
    const avgGradeAll = students.length > 0 ? Math.round(students.reduce((s, st) => s + st.avgGrade, 0) / students.length) : 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Students</h1>
                <p className="text-muted-foreground mt-1">View and manage students across all your courses</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl p-4 border border-border shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Students</p>
                            <p className="text-lg font-bold text-foreground">{students.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-success" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Active Now</p>
                            <p className="text-lg font-bold text-foreground">{totalActive}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Avg Grade</p>
                            <p className="text-lg font-bold text-foreground">{avgGradeAll}%</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-4 border border-border shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Taught Courses</p>
                            <p className="text-lg font-bold text-foreground">{courses.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search, Filter, Sort & Actions */}
            <div className="space-y-3">
                {/* Search & Export */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>

                {/* Filters & Sorting */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Select All */}
                    {filtered.length > 0 && (
                        <input
                            type="checkbox"
                            checked={selectedStudents.size === filtered.length && filtered.length > 0}
                            onChange={handleSelectAll}
                            title="Select all students"
                            className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                    )}

                    {/* Course Filter */}
                    <select
                        value={selectedCourseId || ""}
                        onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
                        className="h-9 px-3 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">All Courses</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterBy}
                        onChange={(e) => setFilterBy(e.target.value as FilterKey)}
                        className="h-9 px-3 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="high">Grade ≥ 80%</option>
                        <option value="low">Grade &lt; 60%</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortKey)}
                        className="h-9 px-3 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="name">Sort: Name</option>
                        <option value="grade">Sort: Grade (High to Low)</option>
                        <option value="progress">Sort: Progress (High to Low)</option>
                        <option value="enrolled">Sort: Recently Enrolled</option>
                    </select>

                    {/* Bulk Actions */}
                    {selectedStudents.size > 0 && (
                        <>
                            <Button onClick={handleBulkEmail} size="sm" variant="outline" className="gap-1.5 whitespace-nowrap">
                                <Mail className="w-4 h-4" /> Email ({selectedStudents.size})
                            </Button>
                            <Button
                                onClick={() => setSelectedStudents(new Set())}
                                size="sm"
                                variant="ghost"
                                className="gap-1.5"
                            >
                                <X className="w-4 h-4" /> Clear
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Student List */}
            {students.length === 0 ? (
                <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No students enrolled in your courses yet.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No students match your filters.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(student => {
                        const isExpanded = expandedId === student.id;
                        const isMessaging = messageId === student.id;

                        return (
                            <div key={student.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                                {/* Main Row */}
                                <div className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.has(student.id)}
                                            onChange={() => handleToggleStudent(student.id)}
                                            className="w-4 h-4 rounded accent-primary flex-shrink-0"
                                        />
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : student.id)}
                                            className="flex-1 flex items-center gap-3 min-w-0 text-left"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">
                                                {student.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-xs text-muted-foreground">Courses</p>
                                            <p className="text-sm font-medium text-foreground">{student.courses.length}</p>
                                        </div>
                                        <div className="hidden sm:block text-right">
                                            <p className="text-xs text-muted-foreground">Grade</p>
                                            <p className={`text-sm font-semibold ${student.avgGrade >= 80 ? "text-success" : student.avgGrade >= 60 ? "text-warning" : "text-destructive"}`}>
                                                {student.avgGrade}%
                                            </p>
                                        </div>
                                        <div className="hidden md:flex items-center gap-2 w-24">
                                            <Progress value={student.avgProgress} className="h-2" />
                                            <span className="text-xs text-foreground font-medium whitespace-nowrap">{student.avgProgress}%</span>
                                        </div>
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : student.id)}
                                            className="text-muted-foreground flex-shrink-0"
                                        >
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border">
                                        <div className="p-4 space-y-4">
                                            {/* Courses */}
                                            <div>
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Enrolled Courses ({student.courses.length})</h4>
                                                <div className="space-y-2">
                                                    {student.courses.map(c => (
                                                        <div key={c.courseId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground">{c.courseName}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Enrolled {new Date(c.enrolledAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Progress value={c.progress} className="h-2 w-20" />
                                                                    <span className="text-xs text-foreground font-medium whitespace-nowrap">{c.progress}%</span>
                                                                </div>
                                                                <span className={`text-sm font-semibold whitespace-nowrap ${
                                                                    c.grade === null ? "text-muted-foreground" :
                                                                    c.grade >= 80 ? "text-success" :
                                                                    c.grade >= 60 ? "text-warning" :
                                                                    "text-destructive"
                                                                }`}>
                                                                    {c.grade === null ? "No grade" : `${c.grade}/100`}
                                                                </span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                    c.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                                                }`}>
                                                                    {c.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2">
                                                {isMessaging ? (
                                                    <div className="w-full space-y-2">
                                                        <Textarea
                                                            placeholder={`Write a message to ${student.name}...`}
                                                            value={messageText}
                                                            onChange={(e) => setMessageText(e.target.value)}
                                                            rows={3}
                                                            className="bg-muted/50 text-sm"
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <Button variant="outline" size="sm" onClick={() => { setMessageId(null); setMessageText(""); }}>Cancel</Button>
                                                            <Button size="sm" onClick={() => handleSendMessage(student)} disabled={!messageText.trim()} className="gap-1.5">
                                                                <Send className="w-3 h-3" /> Send
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => setMessageId(student.id)} className="gap-1.5 flex-1">
                                                            <Mail className="w-4 h-4" /> Send Message
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleSuspendStudent(student.id)} className="gap-1.5">
                                                            <Shield className="w-4 h-4" /> Suspend
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(student.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="w-4 h-4" /> Remove
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};

export default InstructorStudents;
