import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Users, BookOpen, ClipboardCheck, TrendingUp, ChevronRight, Clock, Calendar, BookOpenCheck, Video } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { assignmentAPI, courseAPI, dashboardAPI, quizAPI } from "@/services/api";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    graded: "bg-success/10 text-success",
    late: "bg-destructive/10 text-destructive",
};

const eventIcons: Record<string, typeof Video> = {
    quiz: ClipboardCheck,
    lecture: Video,
    "office-hours": Clock,
    review: BookOpenCheck,
};

type DashboardSubmission = {
    id: string;
    studentName: string;
    studentEmail: string;
    assignmentTitle: string;
    submittedAt: string;
    status: "pending" | "graded" | "late";
    grade: number | null;
};

const InstructorDashboard = () => {
    const { user } = useAuth();

    const [stats, setStats] = useState<{ totalCourses: number; activeCourses: number; totalStudents: number; avgProgress: number } | null>(null);
    const [submissions, setSubmissions] = useState<DashboardSubmission[]>([]);
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingSubs, setLoadingSubs] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const [s, coursesRes] = await Promise.all([
                dashboardAPI.getInstructorStats(),
                courseAPI.getAllCourses({ instructor_id: Number(user?.id), limit: 100 }),
            ]);
            setStats(s);
            const courseList = Array.isArray(coursesRes?.data) ? coursesRes.data : [];
            setMyCourses(courseList.filter((c: any) => c.is_active));
        } finally {
            setLoadingStats(false);
        }
    }, [user?.id]);

    const fetchSubmissions = useCallback(async () => {
        setLoadingSubs(true);
        try {
            const res = await assignmentAPI.listSubmissions();
            const data = res?.data ?? res;
            const arr = Array.isArray(data) ? data : [];
            const mapped: DashboardSubmission[] = arr.map((s: any) => {
                const grade = s?.grade != null && !isNaN(Number(s.grade)) ? Number(s.grade) : null;
                return {
                    id: String(s?.id ?? ""),
                    studentName: s?.user_name ?? `Student #${s?.user_id ?? ""}`,
                    studentEmail: s?.user_email ?? "",
                    assignmentTitle: s?.assignment_title ?? "",
                    submittedAt: s?.submitted_at ?? "",
                    status: (grade != null ? "graded" : "pending") as "graded" | "pending",
                    grade,
                };
            }).filter((s) => s.id);

            mapped.sort((a, b) => {
                const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return tb - ta;
            });

            setSubmissions(mapped);
        } catch {
            setSubmissions([]);
        } finally {
            setLoadingSubs(false);
        }
    }, []);

    const fetchUpcomingEvents = useCallback(async () => {
        try {
            if (!user?.id || myCourses.length === 0) {
                setUpcomingEvents([]);
                return;
            }

            const events: any[] = [];
            
            // Fetch quizzes for all instructor courses in parallel (not sequential)
            const quizResults = await Promise.all(
                myCourses.map(course => 
                    quizAPI.list({ courseId: String(course.id) })
                        .catch(() => null)
                )
            );

            myCourses.forEach((course, idx) => {
                const quizzesRes = quizResults[idx];
                if (!quizzesRes) return;
                
                const quizzes = Array.isArray(quizzesRes?.data) ? quizzesRes.data : [];
                
                quizzes.forEach((quiz: any) => {
                    if (quiz.due_date) {
                        const dueDate = new Date(quiz.due_date);
                        if (dueDate > new Date()) {
                            events.push({
                                id: `quiz-${quiz.id}`,
                                title: quiz.title,
                                type: 'quiz',
                                date: dueDate.toISOString().split('T')[0],
                                time: dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                                course: course.title,
                            });
                        }
                    }
                });
            });

            // Sort by date and time
            events.sort((a, b) => new Date(`${a.date}T00:00`).getTime() - new Date(`${b.date}T00:00`).getTime());
            
            setUpcomingEvents(events);
        } catch {
            setUpcomingEvents([]);
        }
    }, [user?.id, myCourses]);

    useEffect(() => {
        fetchStats();
        fetchSubmissions();

        // Light polling so new student submissions show up without refresh
        const t = window.setInterval(() => {
            fetchSubmissions();
        }, 15000);
        return () => window.clearInterval(t);
    }, [fetchStats, fetchSubmissions]);

    // Fetch upcoming events when courses are loaded
    useEffect(() => {
        if (myCourses.length > 0) {
            fetchUpcomingEvents();
        }
    }, [myCourses, fetchUpcomingEvents]);

    const pendingSubs = useMemo(() => submissions.filter((s) => s.status === "pending"), [submissions]);
    const recentSubs = useMemo(() => submissions.slice(0, 5), [submissions]);
    const avgGrade = useMemo(() => {
        const graded = submissions.filter((s) => s.grade != null);
        if (graded.length === 0) return 0;
        const sum = graded.reduce((acc, s) => acc + (s.grade ?? 0), 0);
        return Math.round(sum / graded.length);
    }, [submissions]);

    const trendData = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const buckets: Array<{ key: string; month: string; submissions: number }> = [];
        const index = new Map<string, number>();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
            index.set(key, buckets.length);
            buckets.push({ key, month: label, submissions: 0 });
        }

        for (const s of submissions) {
            if (!s.submittedAt) continue;
            const d = new Date(s.submittedAt);
            if (Number.isNaN(d.getTime())) continue;
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const idx = index.get(key);
            if (idx != null) buckets[idx].submissions += 1;
        }

        return buckets.map(({ month, submissions }) => ({ month, submissions }));
    }, [submissions]);

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
            {/* Header */}
            <motion.div variants={fadeUp}>
                <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.name || "Instructor"} 👋</h1>
                <p className="text-muted-foreground mt-1">Here's an overview of your teaching activity.</p>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Students", value: loadingStats ? "—" : (stats?.totalStudents ?? 0).toLocaleString(), icon: Users, color: "text-primary bg-primary/10" },
                    { label: "Active Courses", value: loadingStats ? "—" : (stats?.activeCourses ?? 0), icon: BookOpen, color: "text-accent bg-accent/10" },
                    { label: "Pending Grading", value: pendingSubs.length, icon: ClipboardCheck, color: "text-warning bg-warning/10" },
                    { label: "Avg. Grade", value: `${avgGrade}%`, icon: TrendingUp, color: "text-success bg-success/10" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-card rounded-xl p-5 shadow-card border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Chart + Submissions */}
                <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
                    {/* Submissions Trend Chart */}
                    <div className="bg-card rounded-xl p-5 border border-border shadow-card">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Submissions Trend</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(224, 65%, 33%)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="hsl(224, 65%, 33%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 16%, 47%)" />
                                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214, 20%, 90%)", fontSize: 12 }} />
                                <Area type="monotone" dataKey="submissions" stroke="hsl(224, 65%, 33%)" fill="url(#subGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent Submissions Table */}
                    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Recent Submissions</h3>
                            <Link to="/instructor/assignments" className="text-sm text-accent hover:underline font-medium flex items-center gap-1">
                                View all <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignment</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loadingSubs ? (
                                        <tr>
                                            <td className="px-5 py-6 text-sm text-muted-foreground" colSpan={5}>
                                                Loading submissions…
                                            </td>
                                        </tr>
                                    ) : recentSubs.length === 0 ? (
                                        <tr>
                                            <td className="px-5 py-6 text-sm text-muted-foreground" colSpan={5}>
                                                No student submissions yet.
                                            </td>
                                        </tr>
                                    ) : recentSubs.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                                                        {sub.studentName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium text-foreground">{sub.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">{sub.assignmentTitle}</td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${statusColors[sub.status]}`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {sub.status === "pending" || sub.status === "late" ? (
                                                    <Link to={`/instructor/assignments?grade=${encodeURIComponent(sub.id)}`}>
                                                        <Button size="sm" variant="outline" className="text-xs">Grade</Button>
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">{sub.grade}/100</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Schedule + Quick Links */}
                <motion.div variants={fadeUp} className="space-y-6">
                    {/* My Courses Quick */}
                    <div className="bg-card rounded-xl p-5 border border-border shadow-card">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-foreground">My Courses</h3>
                            <Link to="/instructor/courses" className="text-xs text-accent hover:underline font-medium">View all</Link>
                        </div>
                        <div className="space-y-2">
                            {myCourses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No active courses yet.</p>
                            ) : myCourses.slice(0, 5).map(course => (
                                <Link key={course.id} to={`/instructor/course/${course.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    {course.thumbnail ? (
                                        <img src={course.thumbnail} alt={course.title} className="w-10 h-10 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                                        <p className="text-xs text-muted-foreground">{course.students ?? 0} students</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Schedule */}
                    <div className="bg-card rounded-xl p-5 border border-border shadow-card">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-accent" /> Upcoming Schedule
                        </h3>
                        <div className="space-y-3">
                            {upcomingEvents.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-3">No upcoming quizzes scheduled</p>
                            ) : (
                                upcomingEvents.slice(0, 4).map(event => {
                                    const Icon = eventIcons[event.type] || Calendar;
                                    return (
                                        <div key={event.id} className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Icon className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">{event.date} · {event.time}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default InstructorDashboard;
