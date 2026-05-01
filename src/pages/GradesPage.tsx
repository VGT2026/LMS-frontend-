import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Award, BookOpen, Loader2, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { dashboardAPI, assignmentAPI, courseAPI, quizAttemptAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface CourseGrade {
    courseId: number;
    course: string;
    assignments: {
        id: number;
        name: string;
        score: number;
        total: number;
        date: string;
        feedback?: string;
        aiGrade?: boolean;
    }[];
    average: number;
}

const GradesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [overallGrades, setOverallGrades] = useState<CourseGrade[]>([]);
    const [sortBy, setSortBy] = useState<"date" | "name" | "score">("date");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                setLoading(true);
                // Fetch enrolled courses
                const coursesRes = await dashboardAPI.getEnrolledCourses();
                const courses = Array.isArray(coursesRes?.data) ? coursesRes.data : [];

                // Fetch assignment submissions and quiz attempts in parallel
                const [submissionsRes, quizAttemptsRes] = await Promise.all([
                    assignmentAPI.listMySubmissions(),
                    quizAttemptAPI.listMy().catch(() => ({ data: [] })),
                ]);
                const submissions = Array.isArray(submissionsRes?.data) ? submissionsRes.data : [];
                const quizAttempts = Array.isArray(quizAttemptsRes?.data) ? quizAttemptsRes.data : [];

                // Group by course
                const gradesByCourse: { [key: number]: CourseGrade } = {};

                courses.forEach((course: any) => {
                    gradesByCourse[course.id] = {
                        courseId: course.id,
                        course: course.title || "Unknown Course",
                        assignments: [],
                        average: 0,
                    };
                });

                // Add graded assignment submissions (skip ungraded ones)
                // Note: assignment grade is stored as 0-100 percentage, not raw points
                submissions.forEach((sub: any) => {
                    const courseId = sub.course_id || sub.assignment?.course_id;
                    if (courseId && gradesByCourse[courseId] && sub.grade != null) {
                        const gradePercent = Math.min(100, Math.max(0, Number(sub.grade)));
                        const maxPts = Number(sub.max_points || sub.assignment?.max_points || 100);
                        gradesByCourse[courseId].assignments.push({
                            id: sub.id,
                            name: sub.assignment_title || sub.assignment?.title || "Unnamed Assignment",
                            score: Math.round((gradePercent / 100) * maxPts * 100) / 100,
                            total: maxPts,
                            date: sub.graded_at || sub.submitted_at || new Date().toISOString(),
                            feedback: sub.feedback && !sub.feedback.startsWith('Auto-graded:') ? sub.feedback : undefined,
                            aiGrade: !!sub.ai_grade || !!sub.ai_feedback,
                        });
                    }
                });

                // Add quiz attempts
                quizAttempts.forEach((attempt: any) => {
                    const courseId = attempt.course_id;
                    // If course not in enrolled list, create an entry
                    if (courseId && !gradesByCourse[courseId]) {
                        gradesByCourse[courseId] = {
                            courseId: courseId,
                            course: attempt.course_title || "Unknown Course",
                            assignments: [],
                            average: 0,
                        };
                    }
                    if (courseId && gradesByCourse[courseId] && attempt.score != null) {
                        const score = Number(attempt.score);
                        const total = Number(attempt.total_points) || 100;
                        gradesByCourse[courseId].assignments.push({
                            id: attempt.id,
                            name: `Quiz: ${attempt.quiz_title || "Untitled Quiz"}`,
                            score: score,
                            total: total,
                            date: attempt.submitted_at || new Date().toISOString(),
                            feedback: undefined,
                            aiGrade: false,
                        });
                    }
                });

                // Calculate averages and sort
                const gradesArray = Object.values(gradesByCourse)
                    .map(courseGrade => {
                        if (courseGrade.assignments.length > 0) {
                            const avg = Math.round(
                                courseGrade.assignments.reduce(
                                    (sum, a) => sum + (a.score / a.total) * 100,
                                    0
                                ) / courseGrade.assignments.length
                            );
                            courseGrade.average = avg;
                        }
                        // Sort assignments by selected criteria
                        courseGrade.assignments.sort((a, b) => {
                            if (sortBy === "date") {
                                return new Date(b.date).getTime() - new Date(a.date).getTime();
                            } else if (sortBy === "name") {
                                return a.name.localeCompare(b.name);
                            } else {
                                return (b.score / b.total) - (a.score / a.total);
                            }
                        });
                        return courseGrade;
                    })
                    .filter(c => c.assignments.length > 0);

                setOverallGrades(gradesArray);
            } catch (error) {
                console.error("Failed to fetch grades:", error);
                toast({ title: "Error", description: "Could not load grades", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchGrades();
        }
    }, [user?.id, sortBy, toast]);

    const getGradeColor = (pct: number) => pct >= 90 ? "text-success" : pct >= 75 ? "text-accent" : pct >= 60 ? "text-warning" : "text-destructive";
    const getGradeLetter = (pct: number) => pct >= 93 ? "A" : pct >= 90 ? "A-" : pct >= 87 ? "B+" : pct >= 83 ? "B" : pct >= 80 ? "B-" : pct >= 77 ? "C+" : pct >= 73 ? "C" : "D";
    const totalAssignments = overallGrades.reduce((sum, c) => sum + c.assignments.length, 0);
    const gpa = overallGrades.length > 0
        ? Math.round(overallGrades.reduce((sum, c) => sum + c.average, 0) / overallGrades.length)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (overallGrades.length === 0) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
                <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">No Grades Yet</h1>
                    <p className="text-muted-foreground">Complete assignments or quizzes to see your grades here.</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Grades</h1>
                <p className="text-muted-foreground mt-1">Track your academic performance across all courses</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card rounded-xl p-5 border border-border shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Overall Average</p>
                            <p className="text-3xl font-bold text-foreground mt-1">{gpa}%</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-5 border border-border shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">GPA Letter</p>
                            <p className="text-3xl font-bold text-foreground mt-1">{getGradeLetter(gpa)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-accent" />
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-5 border border-border shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Assignments Graded</p>
                            <p className="text-3xl font-bold text-foreground mt-1">{totalAssignments}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <div className="flex gap-2">
                    <Button
                        variant={sortBy === "date" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy("date")}
                    >
                        Latest
                    </Button>
                    <Button
                        variant={sortBy === "name" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy("name")}
                    >
                        Name
                    </Button>
                    <Button
                        variant={sortBy === "score" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy("score")}
                    >
                        Score
                    </Button>
                </div>
            </div>

            {/* Per-course grades */}
            <div className="space-y-4">
                {overallGrades.map(cg => (
                    <div key={cg.courseId} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground text-sm">{cg.course}</h3>
                                    <p className="text-xs text-muted-foreground">{cg.assignments.length} graded assignments</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-bold ${getGradeColor(cg.average)}`}>{cg.average}%</span>
                                <p className="text-xs text-muted-foreground">{getGradeLetter(cg.average)}</p>
                            </div>
                        </div>
                        <div className="divide-y divide-border">
                            {cg.assignments.map((a, i) => {
                                const pct = Math.round((a.score / a.total) * 100);
                                return (
                                    <div key={i} className="px-5 py-4 space-y-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                                                    {a.aiGrade && (
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100">
                                                            AI Graded
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="w-32">
                                                <Progress value={pct} className="h-1.5" />
                                            </div>
                                            <span className={`text-sm font-semibold min-w-[60px] text-right ${getGradeColor(pct)}`}>{a.score}/{a.total}</span>
                                        </div>
                                        {a.feedback && (
                                            <div className="px-3 py-2 rounded-lg bg-muted/50 border border-muted text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">Feedback:</p>
                                                <p className="line-clamp-2">{a.feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default GradesPage;
