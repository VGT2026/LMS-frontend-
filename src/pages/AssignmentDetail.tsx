import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  FileText,
  ListChecks,
  Clock,
  Calendar,
  Trophy,
  Loader2,
  Type,
  AlignLeft,
  Maximize,
  Lock,
  Monitor,
  Video,
  Shield,
  LogOut,
  XCircle,
} from "lucide-react";
import { useAssignments } from "@/contexts/AssignmentContext";
import { assignmentAPI } from "@/services/api";
import { ProctoringOverlay } from "@/components/proctoring/ProctoringOverlay";
import { ExamProctor } from "@/components/exam/ExamProctor";

interface GradeResult {
    totalScore: number;
    maxScore: number;
    percentage: number;
    questionResults: {
        questionId: string;
        earned: number;
        maxPoints: number;
        isCorrect: boolean;
        correctAnswer: string;
        userAnswer: string;
    }[];
}

const parseYmd = (s: string): Date | null => {
  if (!s || typeof s !== "string") return null;
  const [y, m, d] = s.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const AssignmentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { assignments, getAssignmentById } = useAssignments();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [assignment, setAssignment] = useState(assignments.find(a => a.id === id) ?? null);
    const [loading, setLoading] = useState(!assignment && !!id);
    const [submitted, setSubmitted] = useState(false);
    const [alreadySubmitted, setAlreadySubmitted] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [grade, setGrade] = useState<GradeResult | null>(null);
    const [gradeSource, setGradeSource] = useState<"official" | "auto" | null>(null);
    const [aiGrade, setAiGrade] = useState<number | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [violationReason, setViolationReason] = useState<string | null>(null);
    const [integrityNotice, setIntegrityNotice] = useState<string | null>(null);
    const [aiDetected, setAiDetected] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [proctorStartError, setProctorStartError] = useState<string | null>(null);
    const lastFetchIdRef = useRef<string | null>(null);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [startingProctored, setStartingProctored] = useState(false);
    
    // Strike tracking for integrity violations
    const violationStrikesRef = useRef(0);
    const autoViolationSubmittedRef = useRef(false);
    const answersRef = useRef(answers);
    answersRef.current = answers;

    useEffect(() => {
        const found = assignments.find(a => a.id === id);
        if (found) {
            setAssignment(found);
            setLoading(false);
        }
    }, [assignments, id]);

    useEffect(() => {
        if (id && !assignment && lastFetchIdRef.current !== id) {
            lastFetchIdRef.current = id;
            getAssignmentById(id).then((a) => {
                setAssignment(a ?? null);
                setLoading(false);
            });
        }
    }, [id, assignment, getAssignmentById]);

    useEffect(() => {
        if (!assignment || !id) return;
        let cancelled = false;
        // API returns `{ success, data: submission | null }`. Using `data ?? res` is wrong: when data is
        // `null`, `??` falls back to the whole envelope object (truthy) and falsely shows "submitted".
        const parseSubmission = (res: unknown): { grade?: number | null; feedback?: string | null; graded_by?: number | null } | null => {
            if (!res || typeof res !== "object") return null;
            const d = (res as { data?: unknown }).data;
            if (d == null) return null;
            if (typeof d !== "object" || !("id" in d) || !("assignment_id" in d)) return null;
            return d as { grade?: number | null; feedback?: string | null; graded_by?: number | null };
        };
        assignmentAPI
            .getSubmission(id)
            .then((res) => {
                if (cancelled) return;
                const sub = parseSubmission(res);
                if (sub) {
                    setAlreadySubmitted(true);
                    setSubmitted(true);
                    const maxPoints = Number(assignment.points ?? 100) || 100;
                    const score = sub.grade != null ? Number(sub.grade) : null;
                    const rawFeedback = typeof (sub as any).feedback === 'string' ? (sub as any).feedback : null;
                    const feedback = rawFeedback && rawFeedback.startsWith('Auto-graded:') ? null : rawFeedback;
                    setAiGrade(score);
                    setAiFeedback(feedback);

                    if (score != null && !Number.isNaN(score)) {
                        const percentage = Math.round((score / maxPoints) * 100);
                        setGrade({
                            totalScore: Math.max(0, Math.min(maxPoints, score)),
                            maxScore: maxPoints,
                            percentage,
                            questionResults: [],
                        });
                    } else {
                        setGrade(null);
                    }

                    if ((sub as any).graded_by === 0) {
                        setGradeSource("auto");
                    } else {
                        setGradeSource(score != null ? "official" : null);
                    }
                } else {
                    setAlreadySubmitted(false);
                    setSubmitted(false);
                    setGrade(null);
                    setGradeSource(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setAlreadySubmitted(false);
                    setSubmitted(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [assignment?.id, assignment?.points, id]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!submitted && !violationReason) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [submitted, violationReason]);

    if (loading) {
        return (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-40" />
            </div>
            <Card>
              <CardHeader className="space-y-2">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        );
    }

    if (!assignment) {
        return (
          <div className="max-w-3xl mx-auto">
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Assignment not found
                </CardTitle>
                <CardDescription>The assignment you are looking for does not exist or is not available.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link to="/assignments">
                    <ArrowLeft className="w-4 h-4" />
                    Back to assignments
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
    }

    const totalQuestions = assignment.questions?.length ?? 0;
    const answeredCount = useMemo(() => {
      if (!assignment.questions || assignment.questions.length === 0) return 0;
      return assignment.questions.reduce((count, q) => {
        const v = answers[q.id];
        if (q.type === "mcq") return count + (v != null && String(v).length > 0 ? 1 : 0);
        return count + (typeof v === "string" && v.trim().length > 0 ? 1 : 0);
      }, 0);
    }, [assignment.questions, answers]);
    const answeredPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    const due = parseYmd(assignment.dueDate);
    const today = useMemo(() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return t;
    }, []);
    const daysLeft = due ? Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const dueBadge =
      daysLeft == null
        ? null
        : daysLeft < 0
          ? { text: "Overdue", cls: "bg-destructive/10 text-destructive border-destructive/20" }
          : daysLeft === 0
            ? { text: "Due today", cls: "bg-warning/10 text-warning border-warning/20" }
            : daysLeft === 1
              ? { text: "Due tomorrow", cls: "bg-accent/10 text-accent border-accent/20" }
              : daysLeft <= 7
                ? { text: `Due in ${daysLeft}d`, cls: "bg-primary/10 text-primary border-primary/20" }
                : { text: `Due in ${daysLeft}d`, cls: "bg-muted text-muted-foreground border-border" };

    const updateAnswer = (questionId: string, value: string) => {
        if (submitted || !sessionStarted) return;
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const detectAI = (text: string): boolean => {
        const aiPatterns = [
            /as an ai language model/i,
            /certainly!/i,
            /i don't have personal opinions/i,
            /in conclusion, it is important to remember/i,
            /let's delve into/i,
            /moreover, it is noteworthy/i,
            /comprehensive understanding/i,
            /in summary/i
        ];
        return aiPatterns.some(pattern => pattern.test(text));
    };

    const calculateGrade = (isViolation = false): GradeResult => {
        let hasAi = false;

        const questionResults = assignment.questions.map((q) => {
            const userAnswer = answers[q.id] || "";
            let isCorrect = false;
            let earned = 0;
            let correctAnswer = "";
            let userAnswerText = userAnswer;

            if (!isViolation && detectAI(userAnswer)) {
                hasAi = true;
            }

            if (hasAi) {
                earned = 0;
                isCorrect = false;
            } else if (q.type === "mcq") {
                correctAnswer = q.options?.[q.correctOption] ?? "";
                const selectedIdx = Number(userAnswer);
                userAnswerText = Number.isFinite(selectedIdx) ? (q.options?.[selectedIdx] ?? "") : userAnswer;
                isCorrect = selectedIdx === q.correctOption;
                earned = isCorrect ? q.points : 0;
            } else if (q.type === "short-answer") {
                correctAnswer = "Evaluated by instructor";
                const hasContent = userAnswer.trim().length > 0;
                const lengthScore = Math.min(userAnswer.trim().length / 20, 1);
                earned = hasContent ? Math.round(q.points * (0.6 + lengthScore * 0.4)) : 0;
                isCorrect = earned >= q.points * 0.7;
            } else {
                correctAnswer = "Evaluated by instructor";
                const hasContent = userAnswer.trim().length > 0;
                const lengthScore = Math.min(userAnswer.trim().length / 50, 1);
                earned = hasContent ? Math.round(q.points * (0.5 + lengthScore * 0.5)) : 0;
                isCorrect = earned >= q.points * 0.7;
            }

            return {
                questionId: q.id,
                earned,
                maxPoints: q.points,
                isCorrect,
                correctAnswer,
                userAnswer: userAnswerText,
            };
        });

        if (hasAi) setAiDetected(true);

        const totalScore = hasAi ? 0 : questionResults.reduce((sum, r) => sum + r.earned, 0);
        const maxScore = questionResults.reduce((sum, r) => sum + r.maxPoints, 0);

        return {
            totalScore,
            maxScore,
            percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
            questionResults,
        };
    };

    const handleSubmit = async () => {
        if (!id) return;
        if (alreadySubmitted) return;
        if (!sessionStarted) return;
        setSubmitError(null);
        setSubmitting(true);
        const content = JSON.stringify(answers);
        try {
            const response = await assignmentAPI.submit(id, content);
            const data = response?.data;
            const aiScore = data?.aiGrade != null ? Number(data.aiGrade) : null;
            const aiText = data?.aiFeedback != null && !String(data.aiFeedback).startsWith('Auto-graded:') ? String(data.aiFeedback) : null;
            setAiGrade(aiScore);
            setAiFeedback(aiText);

            if (aiScore != null && !Number.isNaN(aiScore) && assignment) {
                const maxPoints = Number(assignment.points ?? 100) || 100;
                setGrade({
                    totalScore: Math.max(0, Math.min(maxPoints, aiScore)),
                    maxScore: maxPoints,
                    percentage: Math.round((aiScore / maxPoints) * 100),
                    questionResults: [],
                });
                setGradeSource("auto");
            } else {
                const result = calculateGrade();
                setGrade(result);
                setGradeSource("auto");
            }

            setSubmitted(true);
            setAlreadySubmitted(true);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleViolation = async (reason: string) => {
        if (!id) return;
        if (autoViolationSubmittedRef.current) return;

        console.log("[ASSIGNMENT VIOLATION]", new Date().toISOString(), "Detected:", reason);

        // Face detection violations use strike system
        const isNoFace = /face not detected|face too|low confidence|low signal|face unavailable|multiple faces/i.test(reason);

        if (!isNoFace) {
            // Tab switching / fullscreen violations auto-submit immediately
            console.warn("[ASSIGNMENT VIOLATION] Hard violation - instant termination:", reason);
            setViolationReason(reason);
            setIntegrityNotice(`❌ ASSIGNMENT TERMINATED: ${reason}`);
            autoViolationSubmittedRef.current = true;
            setSubmitting(true);
            try {
                const content = JSON.stringify(answersRef.current);
                const response = await assignmentAPI.submit(id, content);
                const data = response?.data;
                const aiScore = data?.aiGrade != null ? Number(data.aiGrade) : null;
                const aiText = data?.aiFeedback != null && !String(data.aiFeedback).startsWith('Auto-graded:') ? String(data.aiFeedback) : null;
                setAiGrade(aiScore);
                setAiFeedback(aiText);

                if (aiScore != null && !Number.isNaN(aiScore) && assignment) {
                    const maxPoints = Number(assignment.points ?? 100) || 100;
                    setGrade({
                        totalScore: Math.max(0, Math.min(maxPoints, aiScore)),
                        maxScore: maxPoints,
                        percentage: Math.round((aiScore / maxPoints) * 100),
                        questionResults: [],
                    });
                } else {
                    const result = calculateGrade(true);
                    setGrade(result);
                }

                setGradeSource("auto");
                setSubmitted(true);
                setAlreadySubmitted(true);
            } catch (_) {}
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            return;
        }

        // Face detection violations: 3-strike system
        violationStrikesRef.current += 1;
        console.log(`[ASSIGNMENT VIOLATION] Face detection strike ${violationStrikesRef.current}/3:`, reason);

        if (violationStrikesRef.current < 3) {
            // First 2 strikes: Show warning only
            const strikeMessage = `⚠️ Face detection failed (Strike ${violationStrikesRef.current}/3) - Keep your face visible in camera`;
            console.log("[ASSIGNMENT STRIKE] Setting warning:", strikeMessage);
            setIntegrityNotice(strikeMessage);
            return; // Don't submit yet
        }

        // Strike 3: Auto-submit assignment
        console.log("[ASSIGNMENT VIOLATION] Strike 3 reached - auto-submitting");
        setViolationReason(reason);
        setIntegrityNotice(`❌ Face detection failed repeatedly. Assignment terminated.`);
        autoViolationSubmittedRef.current = true;
        setSubmitting(true);
        try {
            const content = JSON.stringify(answersRef.current);
            const response = await assignmentAPI.submit(id, content);
            const data = response?.data;
            const aiScore = data?.aiGrade != null ? Number(data.aiGrade) : null;
            const aiText = data?.aiFeedback != null && !String(data.aiFeedback).startsWith('Auto-graded:') ? String(data.aiFeedback) : null;
            setAiGrade(aiScore);
            setAiFeedback(aiText);

            if (aiScore != null && !Number.isNaN(aiScore) && assignment) {
                const maxPoints = Number(assignment.points ?? 100) || 100;
                setGrade({
                    totalScore: Math.max(0, Math.min(maxPoints, aiScore)),
                    maxScore: maxPoints,
                    percentage: Math.round((aiScore / maxPoints) * 100),
                    questionResults: [],
                });
            } else {
                const result = calculateGrade(true);
                setGrade(result);
            }

            setGradeSource("auto");
            setSubmitted(true);
            setAlreadySubmitted(true);
        } catch (_) {}
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    };

    const getGradeColor = (pct: number) => {
        if (pct >= 80) return "text-success";
        if (pct >= 60) return "text-warning";
        return "text-destructive";
    };

    const getGradeBg = (pct: number) => {
        if (pct >= 80) return "bg-success/10";
        if (pct >= 60) return "bg-warning/10";
        return "bg-destructive/10";
    };

    const getGradeLabel = (pct: number) => {
        if (pct >= 90) return "Excellent";
        if (pct >= 80) return "Great";
        if (pct >= 70) return "Good";
        if (pct >= 60) return "Satisfactory";
        return "Needs Improvement";
    };

    const beginProctoredSession = async () => {
        setProctorStartError(null);
        setStartingProctored(true);
        try {
            // Re-check permissions at the moment of starting (earlier probes can be stale).
            try {
                const camStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false,
                });
                camStream.getTracks().forEach((t) => t.stop());
            } catch {
                setProctorStartError("Camera is required. Allow camera access to start.");
                return;
            }

            try {
                const micStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true,
                });
                micStream.getTracks().forEach((t) => t.stop());
            } catch {
                setProctorStartError("Microphone is required. Allow microphone access to start.");
                return;
            }

            setSessionStarted(true);
            await document.documentElement.requestFullscreen().catch(() => {});
        } finally {
            setStartingProctored(false);
        }
    };

    if (submitted) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6">
          <Button asChild variant="ghost" className="px-0">
            <Link to="/assignments">
              <ArrowLeft className="w-4 h-4" />
              Back to assignments
            </Link>
          </Button>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl sm:text-2xl">{assignment.title}</CardTitle>
                  <CardDescription className="truncate">{assignment.courseTitle}</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {assignment.dueDate || "—"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    {assignment.points} pts
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {grade ? (
                <>
                  {violationReason || aiDetected ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{violationReason ? "Session terminated" : "Integrity violation"}</AlertTitle>
                      <AlertDescription>
                        <p className="text-sm">
                          {violationReason || "AI-generated patterns were detected in your response."}
                        </p>
                        <p className="text-xs mt-2 opacity-80">Your session ended early; auto-score is based on your completed answers.</p>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getGradeBg(grade.percentage)}`}>
                            {grade.percentage >= 70 ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-warning" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {gradeSource === "official" ? "Graded" : "AI Auto-graded"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {gradeSource === "official"
                                ? "Official grade from instructor"
                                : "AI-generated score and feedback from OpenAI"}
                            </p>
                          </div>
                        </div>
                        <Badge className={getGradeColor(grade.percentage)} variant="outline">
                          {getGradeLabel(grade.percentage)}
                        </Badge>
                      </div>

                      <div className="mt-4 rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Score</p>
                            <p className={`text-3xl font-bold ${getGradeColor(grade.percentage)}`}>
                              {grade.totalScore}/{grade.maxScore}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Percentage</p>
                            <p className={`text-2xl font-bold ${getGradeColor(grade.percentage)}`}>{grade.percentage}%</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Progress value={grade.percentage} className="h-2" />
                        </div>

                        {aiFeedback && (
                          <div className="mt-4 rounded-lg border bg-muted/10 p-3">
                            <p className="text-sm font-semibold text-foreground">Feedback</p>
                            <p className="text-sm mt-1 text-foreground">{aiFeedback}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/10 p-4 space-y-2">
                      <p className="text-sm font-semibold text-foreground">Next steps</p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                        <li>Check “Assignments” for updates.</li>
                        <li>If ungraded, wait for instructor review.</li>
                        <li>Keep an eye on the due date for future tasks.</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Submission received</AlertTitle>
                  <AlertDescription>
                    Your assignment is submitted. Your grade will appear here once the instructor reviews it.
                  </AlertDescription>
                </Alert>
              )}

              {gradeSource === "auto" && grade?.questionResults?.length ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Breakdown</p>
                    <div className="space-y-2">
                      {grade.questionResults.map((r, idx) => (
                        <div key={r.questionId} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">Question {idx + 1}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.isCorrect ? "Correct" : "Incorrect"} · {r.earned}/{r.maxPoints} pts
                            </p>
                          </div>
                          <Badge variant={r.isCorrect ? "secondary" : "outline"} className={r.isCorrect ? "text-success" : "text-muted-foreground"}>
                            {r.isCorrect ? "Correct" : "Review"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
            <CardFooter className="gap-2">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/assignments">Back to assignments</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6 pb-24">
        {/* Tab switching + fullscreen monitoring */}
        <ProctoringOverlay
          isActive={sessionStarted && !alreadySubmitted && !submitted}
          onViolation={handleViolation}
          disableCameraPreview={false}
        />

        {/* Face detection monitoring */}
        {sessionStarted && !alreadySubmitted && !submitted && (
          <ExamProctor
            attemptId={parseInt(id || "0", 10) || Date.now()}
            active={true}
            videoRef={videoRef}
            onNoFace={(reason) => void handleViolation(reason)}
            disableServerOps={true}
          />
        )}

        {/* Integrity notice with auto-submit on 3 strikes */}
        {integrityNotice && sessionStarted && !alreadySubmitted && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-8 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-destructive/30 bg-destructive p-4 text-destructive-foreground shadow-elevated"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold">Integrity notice</p>
              <p className="text-xs opacity-95">{integrityNotice}</p>
            </div>
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10"
              onClick={() => setIntegrityNotice(null)}
              aria-label="Dismiss integrity notice"
            >
              <XCircle className="h-4 w-4 opacity-80" />
            </button>
          </motion.div>
        )}

        {/* Hero header */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="relative px-5 py-6 sm:px-8 sm:py-7 bg-gradient-to-br from-primary/5 via-card to-muted/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                {sessionStarted ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleViolation("Student attempted to leave the assignment page.")}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Exit session
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-full" asChild>
                    <Link to="/assignments">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      All assignments
                    </Link>
                  </Button>
                )}
                <Badge variant="secondary" className="gap-1 rounded-full font-medium">
                  <Shield className="w-3 h-3" />
                  Proctored
                </Badge>
                {dueBadge && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${dueBadge.cls}`}>
                    {dueBadge.text}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight break-words">
                  {assignment.title}
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">{assignment.courseTitle}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1 rounded-full py-1 px-3 font-normal bg-background/80">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Due {assignment.dueDate || "—"}
                </Badge>
                <Badge variant="outline" className="gap-1 rounded-full py-1 px-3 font-normal bg-background/80">
                  <Trophy className="w-3.5 h-3.5 text-accent" />
                  {assignment.points} points
                </Badge>
                {sessionStarted ? (
                  <Badge variant="outline" className="gap-1 rounded-full py-1 px-3 font-normal bg-background/80">
                    <ListChecks className="w-3.5 h-3.5" />
                    {totalQuestions} questions
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 rounded-full py-1 px-3 font-normal bg-muted/60 text-muted-foreground border-dashed">
                    <Lock className="w-3.5 h-3.5" />
                    Content locked until start
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {!sessionStarted ? (
          <Card className="border-primary/15 shadow-card overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">Start when you&apos;re ready</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Instructions and questions stay hidden until you begin. One click enters fullscreen and unlocks the assignment.
                  </p>
                </div>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Monitor className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">Fullscreen</span> — stay in fullscreen while working.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">This tab</span> — don&apos;t leave the page for long; focus checks apply, not cursor tracking.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Video className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                        <span className="font-medium text-foreground">Camera</span> — preview if allowed.
                  </span>
                </li>
              </ul>

              {proctorStartError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Camera / Microphone required</AlertTitle>
                  <AlertDescription>{proctorStartError}</AlertDescription>
                </Alert>
              )}
              {submitError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Submission failed</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => void beginProctoredSession()}
                  className="h-12 text-base font-semibold gap-2 shadow-md sm:flex-1"
                  disabled={alreadySubmitted || submitted || startingProctored}
                >
                  <Maximize className="w-5 h-5" />
                  Start proctored session
                </Button>
                <Button type="button" variant="outline" className="h-12 sm:h-auto" asChild>
                  <Link to="/assignments" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Progress</p>
                <p className="text-xs text-muted-foreground">
                  {answeredCount}/{totalQuestions} questions completed
                </p>
              </div>
              <Badge variant="secondary">{answeredPct}%</Badge>
            </div>
            <Progress value={answeredPct} className="h-2" />

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Submission failed</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              Questions
            </CardTitle>
            <CardDescription>Answer all questions before submitting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.questions.map((q, i) => {
              const rawAnswer = answers[q.id];
              const isAnswered =
                q.type === "mcq"
                  ? rawAnswer != null && String(rawAnswer).length > 0
                  : typeof rawAnswer === "string" && rawAnswer.trim().length > 0;
              const inputsDisabled = !sessionStarted || submitting || alreadySubmitted || submitted;

              const typeMeta =
                q.type === "mcq"
                  ? { label: "MCQ", icon: ListChecks, cls: "bg-primary/10 text-primary border-primary/20" }
                  : q.type === "short-answer"
                    ? { label: "Short", icon: Type, cls: "bg-accent/10 text-accent border-accent/20" }
                    : { label: "Long", icon: AlignLeft, cls: "bg-warning/10 text-warning border-warning/20" };

              const TypeIcon = typeMeta.icon;

              return (
                <div key={q.id} className="rounded-lg border bg-muted/10 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">Q{i + 1}</Badge>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeMeta.cls}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          {typeMeta.label}
                        </span>
                        <Badge variant="outline">{q.points} pts</Badge>
                        {isAnswered ? (
                          <Badge variant="secondary" className="text-success">Answered</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Not answered</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">{q.text}</p>
                    </div>
                  </div>

                  {q.type === "mcq" && (
                    <RadioGroup
                      value={rawAnswer ?? ""}
                      onValueChange={(v) => updateAnswer(q.id, v)}
                      disabled={inputsDisabled}
                      className="gap-3"
                    >
                      {q.options.map((opt, oi) => {
                        const rid = `${q.id}-${oi}`;
                        return (
                          <div key={rid} className="flex items-start gap-3 rounded-lg border bg-background p-3 hover:bg-muted/30 transition-colors">
                            <RadioGroupItem id={rid} value={String(oi)} disabled={inputsDisabled} />
                            <Label htmlFor={rid} className="text-sm font-normal leading-snug cursor-pointer">
                              {opt}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {q.type === "short-answer" && (
                    <Input
                      placeholder="Type your answer…"
                      value={rawAnswer || ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      disabled={inputsDisabled}
                    />
                  )}

                  {q.type === "long-answer" && (
                    <Textarea
                      placeholder="Type your detailed response…"
                      value={rawAnswer || ""}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      rows={6}
                      disabled={inputsDisabled}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
          </>
        )}

        {/* Sticky submit — only after session started (primary start control is in the gate card) */}
        {sessionStarted && (
          <div className="sticky bottom-4 z-20">
            <Card className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-primary/10 shadow-elevated">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Ready to submit?</p>
                  <p className="text-xs text-muted-foreground">
                    {answeredCount < totalQuestions
                      ? `Answer ${totalQuestions - answeredCount} more question${totalQuestions - answeredCount === 1 ? "" : "s"} to submit.`
                      : "All questions answered."}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="h-11 text-base font-semibold shrink-0"
                  disabled={submitting || alreadySubmitted || totalQuestions === 0 || answeredCount < totalQuestions}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : alreadySubmitted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submitted
                    </>
                  ) : (
                    "Submit assignment"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    );
};

export default AssignmentDetail;
