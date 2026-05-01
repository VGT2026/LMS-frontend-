import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Wand2, Upload, Loader2, CheckCircle, Trash2,
    Edit, Save, RotateCcw, Sparkles, ListChecks, History,
    Send, X, Clock, BookOpen, ChevronRight, CheckSquare, Square
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { courseAPI, aiAPI, quizAPI } from "@/services/api";

interface GeneratedQuestion {
    id: string;
    type: "mcq";
    text: string;
    options: string[];
    correctOption: number;
    points: number;
    editing?: boolean;
}

interface HistoryQuiz {
    id: number;
    title: string;
    is_active: boolean;
    total_points: number;
    created_at?: string;
}

const AIQuizGenerator = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [courses, setCourses] = useState<{ id: number; title: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
    const [numQuestions, setNumQuestions] = useState(5);
    const [content, setContent] = useState("");
    const [quizTitle, setQuizTitle] = useState("");
    const [pdfName, setPdfName] = useState("");

    const [generating, setGenerating] = useState(false);
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyQuizzes, setHistoryQuizzes] = useState<HistoryQuiz[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        courseAPI.getAllCourses({ instructor_id: Number(user.id), limit: 100 })
            .then(res => setCourses(Array.isArray(res?.data) ? res.data : []))
            .catch(() => setCourses([]));
    }, [user?.id]);

    const loadHistory = async (courseId: number) => {
        setHistoryLoading(true);
        try {
            const res = await quizAPI.list({ courseId: String(courseId) });
            const raw = res?.data ?? res;
            const list = Array.isArray(raw) ? raw : (raw?.quizzes ?? []);
            setHistoryQuizzes(Array.isArray(list) ? list : []);
        } catch {
            setHistoryQuizzes([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleOpenHistory = () => {
        if (!selectedCourseId) {
            toast({ title: "Select a course first", variant: "destructive" });
            return;
        }
        setHistoryOpen(true);
        loadHistory(selectedCourseId as number);
    };

    const handleGenerate = async () => {
        if (!selectedCourseId) {
            toast({ title: "No course selected", description: "Please select a course first.", variant: "destructive" });
            return;
        }
        if (!content.trim()) {
            toast({ title: "No content", description: "Please paste lesson content or upload a PDF.", variant: "destructive" });
            return;
        }
        setGenerating(true);
        try {
            const topicName = quizTitle.trim() || courses.find(c => c.id === selectedCourseId)?.title || "Lesson";
            const result = await aiAPI.generateQuiz(content, topicName, numQuestions);
            const rawQuestions: Array<{ question: string; options: string[]; correctAnswer: number }> = result?.questions ?? [];
            const generated: GeneratedQuestion[] = rawQuestions.map((q, i) => ({
                id: `q${Date.now()}_${i + 1}`,
                type: "mcq",
                text: q.question,
                options: q.options,
                correctOption: q.correctAnswer,
                points: 10,
            }));
            setQuestions(generated);
            setSelectedIds(new Set(generated.map(q => q.id)));
            if (!quizTitle) setQuizTitle("AI-Generated Quiz");
            toast({ title: "Quiz generated!", description: `${generated.length} questions created by AI.` });
        } catch {
            toast({ title: "Generation failed", description: "Could not generate quiz. Please try again.", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPdfName(file.name);
            setContent(`[Content extracted from ${file.name}]\n\nThis lesson covers fundamental concepts in the field of study including theoretical frameworks, practical applications, and advanced methodologies. Students will learn about core principles and their real-world implementations.\n\nKey topics include: Data Structures, Algorithms, System Design, and Software Engineering best practices. Each topic builds upon the previous one to create a comprehensive understanding of the subject matter.\n\nThe practical component involves hands-on exercises where students apply theoretical knowledge to solve real-world problems. This approach ensures deep understanding and retention of the material.`);
            toast({ title: "PDF loaded", description: `Content extracted from ${file.name}` });
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map(q => q.id)));
        }
    };

    const removeQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    };

    const updateQuestion = (id: string, field: string, value: any) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId: string, optIndex: number, value: string) => {
        setQuestions(prev =>
            prev.map(q =>
                q.id === qId ? { ...q, options: q.options.map((o, i) => i === optIndex ? value : o) } : q
            )
        );
    };

    const buildPayload = (activeIds: Set<string>) => {
        const included = questions.filter(q => activeIds.has(q.id));
        return {
            questionsJson: included.map(q => ({
                question: q.text,
                options: q.options,
                correct: q.correctOption,
                points: q.points,
            })),
            totalPoints: included.reduce((s, q) => s + q.points, 0),
            count: included.length,
        };
    };

    const persistQuiz = async (isActive: boolean) => {
        if (!selectedCourseId || !quizTitle.trim()) return null;
        const { questionsJson, totalPoints, count } = buildPayload(selectedIds);
        if (count === 0) {
            toast({ title: "No questions selected", description: "Select at least one question.", variant: "destructive" });
            return null;
        }
        const created = await quizAPI.create({
            course_id: selectedCourseId as number,
            title: quizTitle.trim(),
            total_points: totalPoints,
            passing_score: Math.round(totalPoints * 0.6),
        });
        const newId = created?.data?.id ?? created?.id;
        if (newId) {
            await quizAPI.update(newId, { questions_json: questionsJson, is_active: isActive });
        }
        return newId;
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const id = await persistQuiz(false);
            if (id) {
                toast({ title: "Draft saved!", description: `"${quizTitle}" saved. Students cannot see it yet.` });
                navigate(`/instructor/course/${selectedCourseId}?tab=Quizzes`);
            }
        } catch {
            toast({ title: "Save failed", description: "Could not save quiz.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const id = await persistQuiz(true);
            if (id) {
                toast({ title: "Quiz published!", description: `"${quizTitle}" is now live for students.` });
                navigate(`/instructor/course/${selectedCourseId}?tab=Quizzes`);
            }
        } catch {
            toast({ title: "Publish failed", description: "Could not publish quiz.", variant: "destructive" });
        } finally {
            setPublishing(false);
        }
    };

    const handleTogglePublishExisting = async (quizId: number, currentlyActive: boolean) => {
        try {
            await quizAPI.update(quizId, { is_active: !currentlyActive });
            toast({
                title: currentlyActive ? "Quiz unpublished" : "Quiz published!",
                description: currentlyActive ? "Students can no longer see this quiz." : "Students can now take this quiz.",
            });
            loadHistory(selectedCourseId as number);
        } catch {
            toast({ title: "Update failed", variant: "destructive" });
        }
    };

    const selectedCount = selectedIds.size;
    const selectedPoints = questions.filter(q => selectedIds.has(q.id)).reduce((s, q) => s + q.points, 0);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                        <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">AI Quiz Generator</h1>
                        <p className="text-sm text-muted-foreground">Paste lesson content or upload a PDF � AI creates quiz questions automatically</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleOpenHistory} className="gap-2">
                    <History className="w-4 h-4" />
                    History
                </Button>
            </div>

            {/* Input Section */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Course <span className="text-destructive">*</span></Label>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        >
                            <option value="">-- Select a course --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                        {courses.length === 0 && (
                            <p className="text-xs text-muted-foreground">No courses found for your account.</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Number of Questions</Label>
                        <select
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                            className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        >
                            {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Quiz Title</Label>
                    <Input
                        placeholder="e.g. Chapter 3: Data Structures Quiz"
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Lesson Content</Label>
                    <Textarea
                        placeholder="Paste your lesson text, notes, or lecture content here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={8}
                        className="bg-muted/50"
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {content.split(/\s+/).filter(Boolean).length} words
                        </p>
                        <div className="flex items-center gap-2">
                            <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handlePdfUpload} className="hidden" id="pdf-upload-gen" />
                            <label
                                htmlFor="pdf-upload-gen"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {pdfName || "Upload PDF"}
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={handleGenerate} disabled={generating || !content.trim()} className="gap-1.5 bg-gradient-primary hover:opacity-90 border-0 text-white shadow-md hover:shadow-lg transition-all">
                        {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Quiz</>}
                    </Button>
                    {questions.length > 0 && (
                        <Button variant="outline" onClick={() => { setQuestions([]); setSelectedIds(new Set()); }} className="gap-1.5">
                            <RotateCcw className="w-4 h-4" /> Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Generating Spinner */}
            {generating && (
                <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                    <p className="text-foreground font-medium">AI is analyzing your content...</p>
                    <p className="text-sm text-muted-foreground mt-1">Generating questions, options, and correct answers</p>
                </div>
            )}

            {/* Questions Section */}
            {!generating && questions.length > 0 && (
                <div className="space-y-4">
                    {/* Stats + Action Bar */}
                    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-5">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-foreground leading-none">{questions.length}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                                </div>
                                <div className="w-px h-8 bg-border" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-blue-500 leading-none">{selectedCount}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Selected</p>
                                </div>
                                <div className="w-px h-8 bg-border" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-amber-500 leading-none">{selectedPoints}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Points</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={toggleSelectAll}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
                                >
                                    {selectedIds.size === questions.length
                                        ? <CheckSquare className="w-3.5 h-3.5" />
                                        : <Square className="w-3.5 h-3.5" />}
                                    {selectedIds.size === questions.length ? "Deselect All" : "Select All"}
                                </button>
                                <Button
                                    onClick={handleSaveDraft}
                                    disabled={saving || publishing || selectedCount === 0}
                                    variant="outline"
                                    className="gap-1.5"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? "Saving..." : "Save Draft"}
                                </Button>
                                <Button
                                    onClick={handlePublish}
                                    disabled={saving || publishing || selectedCount === 0 || !quizTitle.trim()}
                                    className="gap-1.5 bg-gradient-primary hover:opacity-90 border-0 text-white"
                                >
                                    {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {publishing ? "Publishing..." : "Publish Quiz"}
                                </Button>
                            </div>
                        </div>
                        {selectedCount > 0 && selectedCount < questions.length && (
                            <p className="text-xs text-muted-foreground">
                                {questions.length - selectedCount} question(s) deselected � they won't be included when saving or publishing.
                            </p>
                        )}
                    </div>

                    {/* Question Cards */}
                    {questions.map((q, qi) => {
                        const isSelected = selectedIds.has(q.id);
                        return (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: qi * 0.04 }}
                                className={`bg-card rounded-xl border shadow-card p-5 transition-all duration-200 ${isSelected ? "border-border" : "border-border/40 opacity-50"}`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleSelect(q.id)}
                                        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                        title={isSelected ? "Deselect question" : "Select question"}
                                    >
                                        {isSelected
                                            ? <CheckSquare style={{ width: 18, height: 18 }} className="text-primary" />
                                            : <Square style={{ width: 18, height: 18 }} />}
                                    </button>

                                    <div className="flex-1 flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-gradient-primary text-white text-xs font-bold flex items-center justify-center shadow-sm">
                                                {qi + 1}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                <ListChecks className="w-3 h-3" /> MCQ
                                            </span>
                                            <span className="text-xs font-semibold text-amber-500">{q.points} pts</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => updateQuestion(q.id, "editing", !q.editing)}
                                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="Edit question"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => removeQuestion(q.id)}
                                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                title="Remove question"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pl-7">
                                    {q.editing ? (
                                        <div className="space-y-3">
                                            <Textarea
                                                value={q.text}
                                                onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                                                rows={2}
                                                className="text-sm"
                                            />
                                            <div className="space-y-2 pl-2">
                                                {q.options.map((opt, oi) => (
                                                    <div key={oi} className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${q.id}`}
                                                            checked={q.correctOption === oi}
                                                            onChange={() => updateQuestion(q.id, "correctOption", oi)}
                                                            className="accent-primary"
                                                        />
                                                        <Input
                                                            value={opt}
                                                            onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                                            className="text-sm flex-1"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={q.points}
                                                    onChange={(e) => updateQuestion(q.id, "points", parseInt(e.target.value) || 5)}
                                                    className="w-20 text-sm"
                                                />
                                                <span className="text-xs text-muted-foreground">points</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-2">{q.text}</p>
                                            <div className="space-y-1.5">
                                                {q.options.map((opt, oi) => (
                                                    <div
                                                        key={oi}
                                                        className={`flex items-center gap-2 text-sm p-2 rounded-lg ${oi === q.correctOption ? "bg-success/10 text-success font-medium" : "text-foreground"}`}
                                                    >
                                                        {oi === q.correctOption
                                                            ? <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                                            : <div className="w-3.5 h-3.5 rounded-full border-2 border-border flex-shrink-0" />}
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* History Drawer */}
            <AnimatePresence>
                {historyOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-40"
                            onClick={() => setHistoryOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-primary" />
                                    <h2 className="font-semibold text-foreground">Quiz History</h2>
                                    <span className="text-xs text-muted-foreground">� {courses.find(c => c.id === selectedCourseId)?.title}</span>
                                </div>
                                <button onClick={() => setHistoryOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : historyQuizzes.length === 0 ? (
                                    <div className="text-center py-12">
                                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">No quizzes found for this course.</p>
                                    </div>
                                ) : (
                                    historyQuizzes.map(quiz => (
                                        <div key={quiz.id} className="bg-background rounded-xl border border-border p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-foreground text-sm truncate">{quiz.title}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {quiz.total_points !== undefined && (
                                                            <span className="text-xs text-muted-foreground">{quiz.total_points} pts</span>
                                                        )}
                                                        {quiz.created_at && (
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(quiz.created_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${quiz.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                                                    {quiz.is_active ? "Published" : "Draft"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setHistoryOpen(false); navigate(`/instructor/course/${selectedCourseId}?tab=Quizzes`); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" /> View in Course
                                                </button>
                                                <button
                                                    onClick={() => handleTogglePublishExisting(quiz.id, quiz.is_active)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors font-medium ${quiz.is_active ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"}`}
                                                >
                                                    {quiz.is_active ? <><X className="w-3.5 h-3.5" /> Unpublish</> : <><Send className="w-3.5 h-3.5" /> Publish</>}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AIQuizGenerator;
