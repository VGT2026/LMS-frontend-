import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Clock, TrendingUp, Award, ChevronRight, Users, UserCheck, BarChart3,
  GraduationCap, Target, Activity, Layers, UserCircle, Lock, FileText, Bot, Sparkles, ClipboardList
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/contexts/AssignmentContext";
import { dashboardAPI, courseAPI, authAPI, quizAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

import { RecommendationSection } from "@/components/dashboard/RecommendationSection";
import { RoadmapProgress } from "@/components/dashboard/RoadmapProgress";

const DEFAULT_COURSE_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop";

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [studentTab, setStudentTab] = useState<"enrolled" | "all" | "ai-tutor">("enrolled");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setFetchError(null);
      setLoading(true);

      let userStats;
      switch (user.role) {
        case 'student':
          userStats = await dashboardAPI.getStudentStats();
          break;
        case 'instructor':
          userStats = await dashboardAPI.getInstructorStats();
          break;
        case 'admin':
          userStats = await dashboardAPI.getAdminStats();
          break;
        default:
          userStats = await dashboardAPI.getStudentStats();
      }

      setStats(userStats);

      // Fetch courses based on role
      if (user.role === 'student') {
        // Sync user profile (preferredCategories, completedCourseIds, targetJobRoleId) for recommendations/roadmap
        try {
          const profileRes = await authAPI.getProfile();
          const p = profileRes?.data ?? profileRes;
          if (p) {
            const parseIds = (v: unknown): string[] => {
              if (Array.isArray(v)) return v.map(String);
              if (typeof v === 'string') try { return JSON.parse(v).map(String); } catch { return []; }
              return [];
            };
            updateUser({
              preferredCategories: Array.isArray(p.preferred_categories) ? p.preferred_categories : (p.preferred_categories ? parseIds(p.preferred_categories) : undefined),
              completedCourseIds: parseIds(p.completed_course_ids ?? []),
              targetJobRoleId: p.target_job_role_id != null ? String(p.target_job_role_id) : undefined,
            });
          }
        } catch { /* ignore profile fetch */ }

        const [enrolledRes, publishedRes] = await Promise.all([
          dashboardAPI.getEnrolledCourses().catch(() => ({ data: [] })),
          courseAPI.getAllCourses({ limit: 50, include_inactive: true }).catch(() => ({ data: [] })),
        ]);
        const enrolledList = Array.isArray(enrolledRes?.data) ? enrolledRes.data : (Array.isArray(enrolledRes) ? enrolledRes : []);
        const rawPublished = Array.isArray(publishedRes?.data) ? publishedRes.data
          : Array.isArray(publishedRes?.courses) ? publishedRes.courses
          : (Array.isArray(publishedRes) ? publishedRes : []);
        const publishedList = (rawPublished || []).filter((c: any) => c && (c.approval_status === "approved" || !c.approval_status));
        setEnrolledCourses(enrolledList || []);
        setAllCourses(publishedList);
        setUserCourses(publishedList.slice(0, 4));

        // Fetch published quizzes for enrolled courses
        const quizzesRes = await quizAPI.list().catch(() => ({ data: [] }));
        const quizzesList = Array.isArray(quizzesRes?.data) ? quizzesRes.data : Array.isArray(quizzesRes) ? quizzesRes : [];
        setUpcomingQuizzes(quizzesList.slice(0, 4));
      } else if (user.role === 'instructor') {
        const profileRes = await authAPI.getProfile();
        const userId = profileRes?.data?.id;
        const allCoursesRes = await courseAPI.getAllCourses({
          limit: 100,
          ...(userId != null ? { instructor_id: Number(userId) } : {}),
        });
        const coursesList = Array.isArray(allCoursesRes?.data) ? allCoursesRes.data : [];
        setUserCourses(coursesList.slice(0, 4));
      } else {
        const allCoursesRes = await courseAPI.getAllCourses({ limit: 8 });
        const coursesList = Array.isArray(allCoursesRes?.data) ? allCoursesRes.data : [];
        setUserCourses(coursesList.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      const message = error instanceof Error ? error.message : "Failed to load dashboard data.";
      setFetchError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      if (user?.role === 'student') {
        setEnrolledCourses([]);
        setAllCourses([]);
        setUpcomingQuizzes([]);
      }
      setStats(null);
    } finally {
      setLoading(false);
    }
  // Use user?.id and user?.role to avoid re-fetch loop when updateUser() updates profile fields
  }, [user?.id, user?.role, toast, updateUser]);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardData();
    return () => { cancelled = true; };
  }, [fetchDashboardData]);

  // Only show full loading when we have no data yet (prevents flicker when refetching)
  if (loading && !stats && !fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Role-based dashboard content
  const getDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return getAdminDashboard();
      case 'instructor':
        return getInstructorDashboard();
      default:
        return getStudentDashboard();
    }
  };

  const getStudentDashboard = () => {
    const enrolledIds = new Set(enrolledCourses.map((c: any) => Number(c?.id)).filter((id) => !isNaN(id)));
    const enrolledProgressMap = Object.fromEntries(enrolledCourses.map((c: any) => [String(c?.id), c?.progress_percentage ?? c?.progress ?? 0]).filter(([id]) => id != null));
    const parseYmd = (s: string): Date | null => {
      if (!s || typeof s !== "string") return null;
      const raw = s.trim();
      if (!raw) return null;
      // Prefer YYYY-MM-DD parsing, but gracefully handle ISO datetime strings from API.
      const ymd = raw.split("T")[0];
      const [y, m, d] = ymd.split("-").map((n) => Number(n));
      if (y && m && d) return new Date(y, m - 1, d);
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingAssignments = (assignments || [])
      .filter((a: any) => enrolledIds.has(Number(a?.courseId)))
      .filter((a: any) => {
        const due = parseYmd(a?.dueDate || "");
        return due ? due.getTime() >= today.getTime() : true;
      })
      .slice()
      .sort((a: any, b: any) => {
        const da = parseYmd(a?.dueDate || "")?.getTime() ?? Number.POSITIVE_INFINITY;
        const db = parseYmd(b?.dueDate || "")?.getTime() ?? Number.POSITIVE_INFINITY;
        return da - db;
      })
      .slice(0, 4);
    return (
    <>
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Enrolled Courses", value: stats?.enrolledCourses || 0, icon: BookOpen, color: "text-primary bg-primary/10" },
          { label: "In Progress", value: stats?.inProgress || 0, icon: Clock, color: "text-accent bg-accent/10" },
          { label: "Overall Progress", value: `${stats?.overallProgress || 0}%`, icon: TrendingUp, color: "text-success bg-success/10" },
          { label: "Certificates", value: stats?.certificates || 0, icon: Award, color: "text-warning bg-warning/10" },
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
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommendations - pass published courses and enrolled for students */}
          <RecommendationSection user={user} courses={user?.role === "student" ? allCourses : undefined} enrolledCourses={user?.role === "student" ? enrolledCourses : undefined} />

          {/* Courses - Tabs: Enrolled | All Courses | AI Tutor */}
          <motion.div variants={fadeUp} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
                <button
                  onClick={() => setStudentTab("enrolled")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${studentTab === "enrolled" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  My Enrolled ({enrolledCourses.length})
                </button>
                <button
                  onClick={() => setStudentTab("all")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${studentTab === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  All Courses ({allCourses.length})
                </button>
                <button
                  onClick={() => setStudentTab("ai-tutor")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap flex items-center gap-1.5 ${studentTab === "ai-tutor" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <Bot className="w-4 h-4" /> AI Tutor
                </button>
              </div>
              <Link to="/courses" className="text-sm text-accent hover:underline font-medium flex items-center gap-1">
                Browse all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {studentTab === "enrolled" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enrolledCourses.length === 0 ? (
                  <div className="col-span-full bg-card rounded-xl p-12 border border-border text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
                    <Link to="/courses" className="text-sm text-accent hover:underline font-medium mt-2 inline-block">Browse courses to get started</Link>
                  </div>
                ) : (
                  enrolledCourses.map((course: any, idx: number) => {
                    const isDeactivated = course?.is_active === false;
                    const CardWrapper = isDeactivated ? "div" : Link;
                    const cardProps = isDeactivated ? {} : { to: `/course/${course?.id}` };
                    return (
                    <CardWrapper key={course?.id ?? `e-${idx}`} {...cardProps} className={isDeactivated ? "cursor-not-allowed opacity-75" : "group"}>
                      <div className="bg-card rounded-xl overflow-hidden border border-border shadow-card hover:shadow-elevated transition-all duration-300">
                        <div className="h-32 overflow-hidden bg-muted relative">
                          <img
                            src={course?.thumbnail || DEFAULT_COURSE_IMAGE}
                            alt={course?.title || "Course"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.src !== DEFAULT_COURSE_IMAGE) img.src = DEFAULT_COURSE_IMAGE;
                            }}
                          />
                          {isDeactivated && (
                            <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-destructive/90 text-xs font-semibold text-destructive-foreground">Deactivated</span>
                          )}
                        </div>
                        <div className="p-4">
                          <span className="text-xs font-medium text-accent">{course?.category || ""}</span>
                          <h3 className="font-semibold text-foreground mt-1 text-sm line-clamp-1">{course?.title || "Course"}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{course?.instructor || "—"}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5" />
                              {course?.module_count ?? course?.modules?.length ?? 0} modules
                            </span>
                            <span className="flex items-center gap-1">
                              <UserCircle className="w-3.5 h-3.5" />
                              {course?.students ?? course?.enrolledCount ?? 0} students
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span className="font-medium text-foreground">{course?.progress_percentage ?? course?.progress ?? 0}%</span>
                            </div>
                            <Progress value={course?.progress_percentage ?? course?.progress ?? 0} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </CardWrapper>
                  ); })
                )}
              </div>
            ) : studentTab === "all" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allCourses.length === 0 ? (
                      <div className="col-span-full bg-card rounded-xl p-12 border border-border text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No published courses available yet.</p>
                        <Link to="/courses" className="text-sm text-accent hover:underline font-medium mt-2 inline-block">Browse all courses</Link>
                      </div>
                    ) : (
                      allCourses.slice(0, 6).map((course: any, idx: number) => {
                        const isEnrolled = enrolledIds.has(Number(course?.id));
                        const isDeactivated = course?.is_active === false;
                        const CardWrapper = isDeactivated ? "div" : Link;
                        const cardProps = isDeactivated ? {} : { to: `/course/${course?.id}` };
                        return (
                          <CardWrapper key={course?.id ?? `a-${idx}`} {...cardProps} className={isDeactivated ? "cursor-not-allowed opacity-75" : "group"}>
                            <div className="bg-card rounded-xl overflow-hidden border border-border shadow-card hover:shadow-elevated transition-all duration-300">
                              <div className="h-32 overflow-hidden bg-muted relative">
                                <img
                                  src={course?.thumbnail || DEFAULT_COURSE_IMAGE}
                                  alt={course?.title || "Course"}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== DEFAULT_COURSE_IMAGE) img.src = DEFAULT_COURSE_IMAGE;
                                  }}
                                />
                                {isDeactivated && (
                                  <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Locked
                                  </span>
                                )}
                              </div>
                              <div className="p-4">
                                <span className="text-xs font-medium text-accent">{course?.category || ""}</span>
                                <h3 className="font-semibold text-foreground mt-1 text-sm line-clamp-1">{course?.title || "Course"}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{course?.instructor || "—"}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span>{course?.module_count ?? 0} modules</span>
                                  <span>{(course?.students ?? 0).toLocaleString()} students</span>
                                </div>
                                <div className="mt-3">
                                  {isEnrolled ? (
                                    <>
                                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Progress</span>
                                        <span className="font-medium text-foreground">{enrolledProgressMap[String(course?.id)] ?? course?.progress_percentage ?? course?.progress ?? 0}%</span>
                                      </div>
                                      <Progress value={enrolledProgressMap[String(course?.id)] ?? course?.progress_percentage ?? course?.progress ?? 0} className="h-1.5" />
                                    </>
                                  ) : (
                                    <span className="text-sm font-medium text-accent">{isDeactivated ? "Locked" : "View"}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardWrapper>
                        );
                      })
                    )}
              </div>
            ) : (
              <div className="col-span-full bg-card rounded-xl p-12 border border-border text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Tutor & Summarizer</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  Get personalized help from your AI tutor or summarize course content instantly. Available 24/7 to support your learning journey.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link to="/ai-tutor" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                    <Bot className="w-4 h-4" /> Launch AI Tutor
                  </Link>
                  <Link to="/ai-summarizer" className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Summarizer
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <motion.div variants={fadeUp} className="space-y-6">
          {/* Roadmap Progress */}
          <RoadmapProgress user={user} courses={allCourses} />

          {/* Upcoming Assignments */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Assignments
              </h3>
              <Link to="/assignments" className="text-xs text-accent hover:underline font-medium">View all</Link>
            </div>
            {assignmentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading assignments…</p>
            ) : upcomingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {upcomingAssignments.map((a: any) => {
                  const due = parseYmd(a?.dueDate || "");
                  const daysLeft = due ? Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const badge =
                    daysLeft == null ? null :
                    daysLeft < 0 ? { text: "Overdue", cls: "bg-destructive/10 text-destructive" } :
                    daysLeft === 0 ? { text: "Due today", cls: "bg-warning/10 text-warning" } :
                    daysLeft === 1 ? { text: "Due tomorrow", cls: "bg-accent/10 text-accent" } :
                    daysLeft <= 7 ? { text: `Due in ${daysLeft}d`, cls: "bg-primary/10 text-primary" } :
                    { text: `Due in ${daysLeft}d`, cls: "bg-muted text-muted-foreground" };
                  return (
                    <Link
                      key={a?.id}
                      to={`/assignment/${a?.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{a?.title || "Assignment"}</p>
                        <p className="text-xs text-muted-foreground truncate">{a?.courseTitle || "—"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Due: {a?.dueDate || "—"} · {a?.points ?? 0} pts
                        </p>
                      </div>
                      {badge && (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap ${badge.cls}`}>
                          {badge.text}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Quizzes */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-accent" /> Quizzes
              </h3>
              <Link to="/courses" className="text-xs text-accent hover:underline font-medium">View courses</Link>
            </div>
            {upcomingQuizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published quizzes yet.</p>
            ) : (
              <div className="space-y-3">
                {upcomingQuizzes.map((q: any) => {
                  const due = q?.due_date ? parseYmd(q.due_date) : null;
                  const daysLeft = due ? Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const badge =
                    daysLeft == null ? null :
                    daysLeft < 0 ? { text: "Past due", cls: "bg-destructive/10 text-destructive" } :
                    daysLeft === 0 ? { text: "Due today", cls: "bg-warning/10 text-warning" } :
                    daysLeft === 1 ? { text: "Due tomorrow", cls: "bg-accent/10 text-accent" } :
                    daysLeft <= 7 ? { text: `Due in ${daysLeft}d`, cls: "bg-primary/10 text-primary" } :
                    { text: `Due in ${daysLeft}d`, cls: "bg-muted text-muted-foreground" };
                  return (
                    <Link
                      key={q?.id}
                      to={`/exam/${q?.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ClipboardList className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{q?.title || "Quiz"}</p>
                        <p className="text-xs text-muted-foreground truncate">{q?.course_title || "—"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {q?.time_limit ? `${q.time_limit} min` : "No time limit"} · {q?.total_points ?? 0} pts
                        </p>
                      </div>
                      {badge && (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap ${badge.cls}`}>
                          {badge.text}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overall Progress Ring */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-card text-center">
            <h3 className="text-sm font-semibold text-foreground mb-4">Overall Completion</h3>
            <div className="relative w-28 h-28 mx-auto">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--accent))" strokeWidth="8"
                  strokeDasharray={`${(stats?.overallProgress || 0) * 2.64} ${264 - (stats?.overallProgress || 0) * 2.64}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{stats?.overallProgress || 0}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
  };

  const getInstructorDashboard = () => (
    <>
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "My Courses", value: stats?.totalCourses || 0, icon: BookOpen, color: "text-primary bg-primary/10" },
          { label: "Active Courses", value: stats?.activeCourses || 0, icon: Activity, color: "text-accent bg-accent/10" },
          { label: "Total Students", value: stats?.totalStudents?.toLocaleString() || 0, icon: Users, color: "text-success bg-success/10" },
          { label: "Avg. Progress", value: `${stats?.avgProgress || 0}%`, icon: Target, color: "text-warning bg-warning/10" },
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

      {/* Instructor Courses */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">My Courses</h2>
          <Link to="/instructor/courses" className="text-sm text-accent hover:underline font-medium flex items-center gap-1">
            Manage courses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(userCourses || []).map((course, idx) => (
            <Link key={course?.id ?? `ic-${idx}`} to={`/instructor/course/${course?.id}`} className="group">
              <div className="bg-card rounded-xl overflow-hidden border border-border shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="h-32 overflow-hidden bg-muted">
                  <img
                    src={course?.thumbnail || DEFAULT_COURSE_IMAGE}
                    alt={course?.title || "Course"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== DEFAULT_COURSE_IMAGE) img.src = DEFAULT_COURSE_IMAGE;
                    }}
                  />
                </div>
                <div className="p-4">
                  <span className="text-xs font-medium text-accent">{course?.category || ""}</span>
                  <h3 className="font-semibold text-foreground mt-1 text-sm line-clamp-1">{course?.title || "Course"}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{course?.students ?? 0} students</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Avg. Progress</span>
                      <span className="font-medium text-foreground">{course?.progress ?? 0}%</span>
                    </div>
                    <Progress value={course?.progress ?? 0} className="h-1.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );

  const getAdminDashboard = () => (
    <>
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats?.totalUsers?.toLocaleString() || 0, icon: Users, color: "text-primary bg-primary/10" },
          { label: "Active Courses", value: stats?.activeCourses || 0, icon: BookOpen, color: "text-accent bg-accent/10" },
          { label: "Total Courses", value: stats?.totalCourses || 0, icon: GraduationCap, color: "text-success bg-success/10" },
          { label: "Active Users", value: stats?.activeUsers?.toLocaleString() || 0, icon: UserCheck, color: "text-warning bg-warning/10" },
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

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/create-course" className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-elevated transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Create Course</h3>
              <p className="text-sm text-muted-foreground">Add new courses to the platform</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/users" className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-elevated transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Manage Users</h3>
              <p className="text-sm text-muted-foreground">Create instructors and manage users</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/courses" className="bg-card rounded-xl p-6 border border-border shadow-card hover:shadow-elevated transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
              <BarChart3 className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Course Analytics</h3>
              <p className="text-sm text-muted-foreground">View course performance and stats</p>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Recent Courses */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Courses</h2>
          <Link to="/admin/courses" className="text-sm text-accent hover:underline font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(userCourses || []).slice(0, 4).map((course, idx) => (
            <div key={course?.id ?? `ac-${idx}`} className="bg-card rounded-xl overflow-hidden border border-border shadow-card">
              <div className="h-32 overflow-hidden bg-muted">
                <img
                  src={course?.thumbnail || DEFAULT_COURSE_IMAGE}
                  alt={course?.title || "Course"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== DEFAULT_COURSE_IMAGE) img.src = DEFAULT_COURSE_IMAGE;
                  }}
                />
              </div>
              <div className="p-4">
                <span className="text-xs font-medium text-accent">{course?.category || ""}</span>
                <h3 className="font-semibold text-foreground mt-1 text-sm line-clamp-1">{course?.title || "Course"}</h3>
                <p className="text-xs text-muted-foreground mt-1">{course?.instructor || 'Unassigned'}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    course?.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {course?.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-muted-foreground">{course?.students ?? 0} students</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );

  // Role-based welcome message
  const getWelcomeMessage = () => {
    const firstName = user?.name?.split(" ")[0] || "User";
    switch (user?.role) {
      case 'admin':
        return {
          title: `Welcome back, ${firstName} 👑`,
          subtitle: "Manage your LMS platform and oversee all activities."
        };
      case 'instructor':
        return {
          title: `Welcome back, ${firstName} 👨‍🏫`,
          subtitle: "Track your courses and student progress."
        };
      default:
        return {
          title: `Welcome back, ${firstName} 👋`,
          subtitle: "Continue your learning journey and explore new courses."
        };
    }
  };

  const { title, subtitle } = getWelcomeMessage();

  return (
    <motion.div variants={stagger} initial={false} animate="show" className="space-y-6 max-w-7xl">
      {/* Error banner with retry */}
      {fetchError && (
        <motion.div variants={fadeUp} className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive font-medium">{fetchError}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-4 py-2 text-sm font-medium bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      {/* Role-based Dashboard Content */}
      {getDashboardContent()}
    </motion.div>
  );
};

export default Dashboard;
