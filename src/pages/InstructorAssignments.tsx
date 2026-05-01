import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAssignments, Question, QuestionType } from "@/contexts/AssignmentContext";
import { authAPI, courseAPI, assignmentAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, X, FileText, CheckCircle, AlertTriangle, Clock, Plus, Calendar, Trophy, Trash2, ListChecks, AlignLeft, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    graded: "bg-success/10 text-success",
    late: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, typeof Clock> = {
    pending: Clock,
    graded: CheckCircle,
    late: AlertTriangle,
};

interface Submission {
    id: string;
    assignmentId: string;
    studentName: string;
    studentEmail: string;
    courseId: string;
    courseTitle: string;
    assignmentTitle: string;
    submittedAt: string;
    status: "pending" | "graded" | "late";
    grade: number | null;
    feedback: string;
    content: string | null;
    fileName: string;
}

interface InstructorCourse {
    id: string;
    title: string;
    status?: string;
}

const questionTypeLabels: Record<QuestionType, string> = {
    mcq: "Multiple Choice",
    "short-answer": "Short Answer",
    "long-answer": "Long Answer",
};

const questionTypeIcons: Record<QuestionType, typeof ListChecks> = {
    mcq: ListChecks,
    "short-answer": Type,
    "long-answer": AlignLeft,
};

const InstructorAssignments = () => {
    const { toast } = useToast();
    const { assignments, addAssignment, refreshAssignments } = useAssignments();
    const location = useLocation();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [instructorCourses, setInstructorCourses] = useState<InstructorCourse[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingSubs, setLoadingSubs] = useState(true);
    const [courseFilter, setCourseFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [gradingId, setGradingId] = useState<string | null>(null);
    const [gradeInput, setGradeInput] = useState("");
    const [feedbackInput, setFeedbackInput] = useState("");
    const [gradingAssignment, setGradingAssignment] = useState<any | null>(null);
    const [loadingGradingAssignment, setLoadingGradingAssignment] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
    const [optimisticPublishedIds, setOptimisticPublishedIds] = useState<Set<string>>(new Set());

    // Create assignment modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newCourseId, setNewCourseId] = useState("");
    const [newDueDate, setNewDueDate] = useState("");
    const [newPoints, setNewPoints] = useState("100");
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const profileRes = await authAPI.getProfile();
                const userId = profileRes?.data?.id;
                if (!userId || (profileRes?.data?.role !== "instructor" && profileRes?.data?.role !== "admin")) {
                    setInstructorCourses([]);
                    return;
                }
                const coursesRes = await courseAPI.getAllCourses({ instructor_id: userId, limit: 100 });
                const list = coursesRes?.data ?? [];
                setInstructorCourses(
                    Array.isArray(list)
                        ? list.map((c: any) => ({
                            id: String(c.id),
                            title: c.title ?? "",
                            status: c.is_active ? "active" : "draft",
                          }))
                        : []
                );
            } catch {
                setInstructorCourses([]);
            } finally {
                setLoadingCourses(false);
            }
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const res = await assignmentAPI.listSubmissions();
                const list = res?.data ?? res ?? [];
                const arr = Array.isArray(list) ? list : [];
                setSubmissions(
                    arr.map((s: any) => ({
                        id: String(s.id),
                        assignmentId: String(s.assignment_id ?? ""),
                        studentName: s.user_name ?? `Student #${s.user_id}`,
                        studentEmail: s.user_email ?? "",
                        courseId: String(s.course_id ?? ""),
                        courseTitle: s.course_title ?? "",
                        assignmentTitle: s.assignment_title ?? "",
                        submittedAt: s.submitted_at ?? "",
                        status: (s.grade != null ? "graded" : "pending") as "pending" | "graded" | "late",
                        grade: s.grade ?? null,
                        feedback: s.feedback ?? "",
                        content: s.content ?? null,
                        fileName: "Answers",
                    }))
                );
            } catch {
                setSubmissions([]);
            } finally {
                setLoadingSubs(false);
            }
        };
        fetchSubmissions();
    }, []);

    const filtered = submissions.filter(s =>
        (courseFilter === "all" || s.courseId === courseFilter) &&
        (statusFilter === "all" || s.status === statusFilter)
    );

    const gradingSub = submissions.find(s => s.id === gradingId);

    // If coming from Instructor Dashboard "Grade" button, auto-open modal for that submission
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const toGrade = params.get("grade");
        if (!toGrade) return;
        if (gradingId) return;
        const sub = submissions.find(s => s.id === toGrade);
        if (!sub) return;
        setGradingId(sub.id);
        setGradeInput(sub.grade?.toString() || "");
        setFeedbackInput(sub.feedback || "");
        navigate(location.pathname, { replace: true });
    }, [gradingId, location.pathname, location.search, navigate, submissions]);

    const parsedAnswers = useMemo(() => {
        const raw = gradingSub?.content;
        if (!raw || typeof raw !== "string") return {};
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }, [gradingSub?.content]);

    useEffect(() => {
        const loadAssignmentForGrading = async () => {
            if (!gradingId) {
                setGradingAssignment(null);
                return;
            }
            const sub = submissions.find(s => s.id === gradingId);
            if (!sub?.assignmentId) {
                setGradingAssignment(null);
                return;
            }
            setLoadingGradingAssignment(true);
            try {
                const res = await assignmentAPI.getById(sub.assignmentId);
                const data = res?.data ?? res;
                setGradingAssignment(data ?? null);
            } catch {
                setGradingAssignment(null);
            } finally {
                setLoadingGradingAssignment(false);
            }
        };
        loadAssignmentForGrading();
    }, [gradingId, submissions]);

    const handleGrade = async () => {
        const gradeVal = parseFloat(gradeInput);
        if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > 100) {
            toast({ title: "Invalid grade", description: "Please enter a grade between 0 and 100.", variant: "destructive" });
            return;
        }
        try {
            await assignmentAPI.gradeSubmission(Number(gradingId), gradeVal, feedbackInput);
            setSubmissions(submissions.map(s =>
                s.id === gradingId ? { ...s, grade: gradeVal, feedback: feedbackInput, status: "graded" as const } : s
            ));
            setGradingId(null);
            setGradeInput("");
            setFeedbackInput("");
            toast({ title: "Grade submitted", description: `${gradingSub?.studentName}'s submission has been graded.` });
        } catch (err) {
            toast({ title: "Failed to grade", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
        }
    };

    const handleBulkGrade = async () => {
        if (selectedIds.size === 0) return;
        let done = 0;
        for (const subId of selectedIds) {
            const sub = submissions.find(s => s.id === subId && s.status !== "graded");
            if (sub) {
                try {
                    await assignmentAPI.gradeSubmission(Number(subId), sub.grade ?? 80, sub.feedback || "Good work.");
                    done++;
                } catch (_) {}
            }
        }
        if (done > 0) {
            setSubmissions(submissions.map(s =>
                selectedIds.has(s.id) && s.status !== "graded" ? { ...s, status: "graded" as const, grade: s.grade ?? 80, feedback: s.feedback || "Good work." } : s
            ));
            toast({ title: "Bulk grading complete", description: `${done} submission(s) marked as graded.` });
        }
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        const updated = new Set(selectedIds);
        if (updated.has(id)) updated.delete(id); else updated.add(id);
        setSelectedIds(updated);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(s => s.id)));
        }
    };

    // Question builder helpers
    const addQuestion = (type: QuestionType) => {
        const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (type === "mcq") {
            setQuestions([...questions, { id, type: "mcq", text: "", options: ["", "", "", ""], correctOption: 0, points: 10 }]);
        } else if (type === "short-answer") {
            setQuestions([...questions, { id, type: "short-answer", text: "", points: 10 }]);
        } else {
            setQuestions([...questions, { id, type: "long-answer", text: "", points: 10 }]);
        }
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } as Question : q));
    };

    const updateMCQOption = (questionId: string, optionIndex: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId && q.type === "mcq") {
                const options = [...q.options];
                options[optionIndex] = value;
                return { ...q, options };
            }
            return q;
        }));
    };

    const addMCQOption = (questionId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId && q.type === "mcq") {
                return { ...q, options: [...q.options, ""] };
            }
            return q;
        }));
    };

    const removeMCQOption = (questionId: string, optionIndex: number) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId && q.type === "mcq" && q.options.length > 2) {
                const options = q.options.filter((_, i) => i !== optionIndex);
                const correctOption = q.correctOption >= options.length ? 0 : q.correctOption;
                return { ...q, options, correctOption };
            }
            return q;
        }));
    };

    const handleCreateAssignment = async () => {
        if (!newTitle || !newCourseId || !newDueDate) {
            toast({ title: "Missing fields", description: "Please fill in title, course, and due date.", variant: "destructive" });
            return;
        }
        if (questions.length === 0) {
            toast({ title: "No questions", description: "Please add at least one question.", variant: "destructive" });
            return;
        }
        const hasEmptyQuestion = questions.some(q => !q.text.trim());
        if (hasEmptyQuestion) {
            toast({ title: "Empty question", description: "Please fill in all question texts.", variant: "destructive" });
            return;
        }
        const course = instructorCourses.find(c => c.id === newCourseId);
        const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
        try {
            await addAssignment({
                title: newTitle,
                description: newDescription,
                courseId: newCourseId,
                courseTitle: course?.title || "",
                dueDate: newDueDate,
                points: totalPoints,
                questions,
            });
            resetCreateForm();
            toast({ title: "Draft created", description: `"${newTitle}" saved as draft. Publish it when ready for students.` });
        } catch (err) {
            toast({ title: "Failed to create", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
        }
    };

    const resetCreateForm = () => {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewCourseId("");
        setNewDueDate("");
        setNewPoints("100");
        setQuestions([]);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Assignments & Grading</h1>
                    <p className="text-muted-foreground mt-1">Create assignments and grade student submissions</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Create Draft
                </Button>
            </div>

            {/* Created Assignments List */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Assignments</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((a) => (
                        <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card rounded-xl border border-border shadow-card p-5 hover:shadow-elevated transition-shadow"
                        >
                            {(() => {
                                const aid = String(a.id);
                                const isOptimistic = optimisticPublishedIds.has(aid);
                                const isPublished = Boolean(a.isPublished) || isOptimistic;
                                const isPublishing = publishingIds.has(aid);
                                return (
                            <>
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-md">{a.courseTitle}</span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${isPublished ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                                        {isPublished ? "Published" : "Draft"}
                                    </span>
                                </div>
                            </div>
                            <h3 className="font-semibold text-foreground text-sm mb-1">{a.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{a.description}</p>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {a.questions.length > 0 && (
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                                        {a.questions.length} question{a.questions.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                                {a.questions.filter(q => q.type === "mcq").length > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                        {a.questions.filter(q => q.type === "mcq").length} MCQ
                                    </span>
                                )}
                                {a.questions.filter(q => q.type === "short-answer").length > 0 && (
                                    <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-md">
                                        {a.questions.filter(q => q.type === "short-answer").length} Short
                                    </span>
                                )}
                                {a.questions.filter(q => q.type === "long-answer").length > 0 && (
                                    <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-md">
                                        {a.questions.filter(q => q.type === "long-answer").length} Long
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(a.dueDate).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Trophy className="w-3 h-3" />
                                        {a.points} pts
                                    </span>
                                </div>
                                {!isPublished && (
                                    <Button
                                        size="sm"
                                        className="text-xs gap-1"
                                        disabled={isPublishing}
                                        onClick={async () => {
                                            setPublishingIds((prev) => new Set(prev).add(aid));
                                            setOptimisticPublishedIds((prev) => new Set(prev).add(aid));
                                            try {
                                                await assignmentAPI.publish(aid);
                                                toast({ title: "Published", description: `"${a.title}" is now visible to students.` });
                                                await refreshAssignments();
                                            } catch (err) {
                                                setOptimisticPublishedIds((prev) => {
                                                    const next = new Set(prev);
                                                    next.delete(aid);
                                                    return next;
                                                });
                                                toast({ title: "Failed to publish", variant: "destructive" });
                                            } finally {
                                                setPublishingIds((prev) => {
                                                    const next = new Set(prev);
                                                    next.delete(aid);
                                                    return next;
                                                });
                                            }
                                        }}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> Publish
                                    </Button>
                                )}
                            </div>
                            </>
                                );
                            })()}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Student Submissions</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                        <SelectTrigger className="w-full sm:w-56">
                            <SelectValue placeholder="All Courses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {instructorCourses.filter(c => c.status === "active" || !c.status).map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                        {["all", "pending", "graded", "late"].map(s => (
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
                    {selectedIds.size > 0 && (
                        <Button onClick={handleBulkGrade} size="sm" className="gap-1.5 ml-auto">
                            <CheckCircle className="w-4 h-4" /> Grade Selected ({selectedIds.size})
                        </Button>
                    )}
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                {loadingSubs ? (
                    <div className="p-12 text-center">
                        <p className="text-muted-foreground">Loading submissions...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No submissions match your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="px-5 py-3 text-left">
                                        <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assignment</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(sub => {
                                    const Icon = statusIcons[sub.status];
                                    return (
                                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <Checkbox checked={selectedIds.has(sub.id)} onCheckedChange={() => toggleSelect(sub.id)} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                                                        {sub.studentName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{sub.studentName}</p>
                                                        <p className="text-xs text-muted-foreground">{sub.studentEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm text-foreground">{sub.assignmentTitle}</p>
                                                        <p className="text-xs text-muted-foreground">{sub.fileName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">{sub.courseTitle}</td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium capitalize ${statusColors[sub.status]}`}>
                                                    <Icon className="w-3 h-3" /> {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm font-semibold text-foreground">
                                                {sub.grade !== null ? `${sub.grade}/100` : "—"}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {sub.status !== "graded" ? (
                                                    <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                                        setGradingId(sub.id);
                                                        setGradeInput(sub.grade?.toString() || "");
                                                        setFeedbackInput(sub.feedback || "");
                                                    }}>
                                                        Grade
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                                                        setGradingId(sub.id);
                                                        setGradeInput(sub.grade?.toString() || "");
                                                        setFeedbackInput(sub.feedback || "");
                                                    }}>
                                                        Edit
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Grading Modal */}
            {gradingId && gradingSub && (
                <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-xl border border-border shadow-elevated max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <div>
                                <h3 className="font-semibold text-foreground">Grade Submission</h3>
                                <p className="text-sm text-muted-foreground">{gradingSub.studentName} — {gradingSub.assignmentTitle}</p>
                            </div>
                            <button onClick={() => setGradingId(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto">
                            <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">{gradingSub.fileName}</span>
                                <span className="text-xs text-muted-foreground ml-auto">Submitted {new Date(gradingSub.submittedAt).toLocaleString()}</span>
                            </div>

                            <div className="space-y-2">
                                <Label>Student Answers</Label>
                                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                                    {loadingGradingAssignment ? (
                                        <p className="text-sm text-muted-foreground">Loading answers…</p>
                                    ) : Array.isArray(gradingAssignment?.questions) && gradingAssignment.questions.length > 0 ? (
                                        <div className="space-y-3">
                                            {gradingAssignment.questions.map((q: any, idx: number) => {
                                                const qid = String(q.id ?? "");
                                                const qType = q.type as QuestionType;
                                                const rawAnswer = (parsedAnswers as any)?.[qid];
                                                const answered =
                                                    qType === "mcq"
                                                        ? rawAnswer != null && String(rawAnswer).length > 0
                                                        : typeof rawAnswer === "string" && rawAnswer.trim().length > 0;
                                                const answerText =
                                                    qType === "mcq"
                                                        ? (() => {
                                                              const sel = Number(rawAnswer);
                                                              if (!Number.isFinite(sel)) return String(rawAnswer ?? "");
                                                              const opt = Array.isArray(q.options) ? q.options[sel] : "";
                                                              return opt ?? "";
                                                          })()
                                                        : String(rawAnswer ?? "");

                                                return (
                                                    <div key={qid || idx} className="rounded-lg border border-border bg-background p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    Q{idx + 1}. {q.text}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                                                    {questionTypeLabels[qType]} · {q.points ?? 0} pts
                                                                </p>
                                                            </div>
                                                            <span className={`text-xs font-medium px-2 py-1 rounded-md ${answered ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                                                                {answered ? "Answered" : "No answer"}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                                                            <pre className="whitespace-pre-wrap text-sm text-foreground">{answerText || "—"}</pre>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : Object.keys(parsedAnswers).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(parsedAnswers).map(([qid, ans]) => (
                                                <div key={qid} className="rounded-lg border border-border bg-background p-3">
                                                    <p className="text-sm font-semibold text-foreground">Question {qid}</p>
                                                    <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
                                                        <pre className="whitespace-pre-wrap text-sm text-foreground">{String(ans ?? "") || "—"}</pre>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No answer content found for this submission.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Grade (0-100)</Label>
                                <Input type="number" min="0" max="100" placeholder="Enter grade..." value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Feedback</Label>
                                <Textarea placeholder="Write feedback for the student..." value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} rows={4} className="bg-muted/50" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-border flex gap-3 justify-end flex-shrink-0">
                            <Button variant="outline" onClick={() => setGradingId(null)}>Cancel</Button>
                            <Button onClick={handleGrade} className="gap-1.5"><CheckCircle className="w-4 h-4" /> Submit Grade</Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Create Assignment Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-xl border border-border shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                            <div>
                                <h3 className="font-semibold text-foreground">Create New Assignment</h3>
                                <p className="text-sm text-muted-foreground">Add questions and publish to students</p>
                            </div>
                            <button onClick={resetCreateForm} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5 overflow-y-auto flex-1">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Assignment Title *</Label>
                                    <Input placeholder="e.g. Custom Hooks Project" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea placeholder="Describe the assignment requirements..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} className="bg-muted/50" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Course *</Label>
                                        <Select value={newCourseId} onValueChange={setNewCourseId}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {instructorCourses.filter(c => c.status === "active" || !c.status).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Due Date *</Label>
                                        <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Total Points</Label>
                                        <div className="bg-muted/50 rounded-md px-3 py-2 text-sm text-foreground border border-border">
                                            {questions.reduce((sum, q) => sum + q.points, 0) || 0} pts (auto)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Questions Section */}
                            <div className="border-t border-border pt-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground text-sm">Questions</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">{questions.length} question{questions.length !== 1 ? "s" : ""} added</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => addQuestion("mcq")}>
                                            <ListChecks className="w-3.5 h-3.5" /> MCQ
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => addQuestion("short-answer")}>
                                            <Type className="w-3.5 h-3.5" /> Short
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => addQuestion("long-answer")}>
                                            <AlignLeft className="w-3.5 h-3.5" /> Long
                                        </Button>
                                    </div>
                                </div>

                                {questions.length === 0 ? (
                                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                                        <ListChecks className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No questions yet. Add MCQ, Short Answer, or Long Answer questions using the buttons above.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {questions.map((q, idx) => {
                                            const QIcon = questionTypeIcons[q.type];
                                            return (
                                                <motion.div
                                                    key={q.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="border border-border rounded-xl p-4 bg-muted/20"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                                            <QIcon className="w-4 h-4 text-muted-foreground" />
                                                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{questionTypeLabels[q.type]}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={q.points}
                                                                    onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })}
                                                                    className="w-16 h-7 text-xs text-center"
                                                                />
                                                                <span className="text-xs text-muted-foreground">pts</span>
                                                            </div>
                                                            <button onClick={() => removeQuestion(q.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <Input
                                                            placeholder="Enter question text..."
                                                            value={q.text}
                                                            onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                            className="text-sm"
                                                        />

                                                        {/* MCQ Options */}
                                                        {q.type === "mcq" && (
                                                            <div className="space-y-2 pl-1">
                                                                <Label className="text-xs">Options (click radio to set correct answer)</Label>
                                                                {q.options.map((opt, oi) => (
                                                                    <div key={oi} className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => updateQuestion(q.id, { correctOption: oi })}
                                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${q.correctOption === oi
                                                                                ? "border-primary bg-primary"
                                                                                : "border-border hover:border-primary/50"
                                                                                }`}
                                                                        >
                                                                            {q.correctOption === oi && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                                                                        </button>
                                                                        <Input
                                                                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                                            value={opt}
                                                                            onChange={(e) => updateMCQOption(q.id, oi, e.target.value)}
                                                                            className="h-8 text-sm"
                                                                        />
                                                                        {q.options.length > 2 && (
                                                                            <button onClick={() => removeMCQOption(q.id, oi)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {q.options.length < 6 && (
                                                                    <button
                                                                        onClick={() => addMCQOption(q.id)}
                                                                        className="text-xs text-accent hover:underline flex items-center gap-1 mt-1"
                                                                    >
                                                                        <Plus className="w-3 h-3" /> Add option
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Short answer hint */}
                                                        {q.type === "short-answer" && (
                                                            <div className="bg-muted/50 rounded-lg px-3 py-2">
                                                                <p className="text-xs text-muted-foreground italic">Students will see a single-line text input for their answer.</p>
                                                            </div>
                                                        )}

                                                        {/* Long answer hint */}
                                                        {q.type === "long-answer" && (
                                                            <div className="bg-muted/50 rounded-lg px-3 py-2">
                                                                <p className="text-xs text-muted-foreground italic">Students will see a multi-line textarea for their detailed response.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-border flex items-center justify-between flex-shrink-0">
                            <p className="text-xs text-muted-foreground">
                                {questions.length} question{questions.length !== 1 ? "s" : ""} · {questions.reduce((s, q) => s + q.points, 0)} total points
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={resetCreateForm}>Cancel</Button>
                                <Button onClick={handleCreateAssignment} className="gap-1.5">
                                    <Plus className="w-4 h-4" /> Create Draft
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default InstructorAssignments;
