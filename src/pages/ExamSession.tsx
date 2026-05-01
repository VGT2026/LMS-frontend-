import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { quizAPI, quizAttemptAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Maximize,
  Shield,
  Trophy,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { ExamProctor } from "@/components/exam/ExamProctor";

type ExamQuestion = { id: string; prompt: string; options: string[]; points?: number };

function formatDuration(min: number) {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} hour${h > 1 ? "s" : ""}`;
  }
  return `${min} min`;
}

/** Seconds → `MM:SS` for exam countdown / elapsed. */
function formatExamClock(totalSec: number) {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function tabLockId(): string {
  try {
    const k = "lms_exam_tab";
    let id = sessionStorage.getItem(k);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(k, id);
    }
    return id;
  } catch {
    return `tab-${Date.now()}`;
  }
}

const ExamSession = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shell, setShell] = useState<any>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  const [phase, setPhase] = useState<"intro" | "exam" | "result">("intro");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remainingSec, setRemainingSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [review, setReview] = useState<any[]>([]);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const autoSubmitDone = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const violationStrikesRef = useRef(0);
  const autoViolationSubmittedRef = useRef(false);
  const [integrityNotice, setIntegrityNotice] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  // Soft-integrity tuning: let users briefly switch apps/tabs without instantly failing.
  const VISIBILITY_GRACE_MS = 2500;
  const visibilityTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await quizAPI.getExam(quizId);
      const data = res?.data ?? res;
      setShell(data);
      setQuestions(data?.questions ?? []);
      if (data?.lastSubmitted && !data?.resume) {
        setPhase("result");
        setResult({
          score: data.lastSubmitted.score,
          total_points: data.quiz?.total_points ?? 100,
          correct_count: data.lastSubmitted.correct_count,
          wrong_count: data.lastSubmitted.wrong_count,
          passing_score: data.quiz?.passing_score ?? 60,
        });
        setReview([]);
      }
      if (data?.resume) {
        setAttemptId(data.resume.attemptId);
        setAnswers(data.resume.answers ?? {});
        setEndsAt(data.resume.endsAt);
        setPhase("exam");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load exam");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Timer — only when exam phase and endsAt set */
  useEffect(() => {
    if (phase !== "exam" || !endsAt) return;
    const tick = () => {
      const end = new Date(endsAt).getTime();
      const sec = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemainingSec(sec);
      if (sec <= 0 && !autoSubmitDone.current && !autoViolationSubmittedRef.current) {
        autoSubmitDone.current = true;
        void (async () => {
          if (!attemptId) return;
          setSubmitting(true);
          try {
            const latest = answersRef.current;
            await quizAttemptAPI.save(attemptId, latest);
            const res = await quizAttemptAPI.submit(attemptId, latest);
            const data = res?.data ?? res;
            setResult(data?.result);
            setReview(data?.review ?? []);
            setPhase("result");
            if (attemptId) await quizAttemptAPI.log(attemptId, "auto_submit", "timer_end");
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          } finally {
            setSubmitting(false);
          }
        })();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, attemptId]);

  /* Autosave */
  useEffect(() => {
    if (phase !== "exam" || !attemptId) return;
    const id = window.setInterval(() => {
      quizAttemptAPI.save(attemptId, answersRef.current).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [phase, attemptId]);

  /* Anti-cheat: copy / paste / context menu */
  useEffect(() => {
    if (phase !== "exam") return;
    const block = (e: Event) => e.preventDefault();
    const onVis = () => {
      if (document.visibilityState === "hidden" && attemptId) {
        void quizAttemptAPI.log(attemptId, "visibility_hidden", "tab_or_minimize");
      }
    };
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase, attemptId]);

  /* Integrity: tab switch / minimize / overlay (visibilitychange) */
  useEffect(() => {
    if (phase !== "exam" || !attemptId) return;

    const clearVisibilityTimer = () => {
      if (visibilityTimerRef.current != null) {
        clearTimeout(visibilityTimerRef.current);
        visibilityTimerRef.current = null;
      }
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        clearVisibilityTimer();
        visibilityTimerRef.current = window.setTimeout(() => {
          void handleExamViolation(
            "This page was left in the background for too long (another tab, minimize, or overlay)"
          );
        }, VISIBILITY_GRACE_MS);
      } else {
        clearVisibilityTimer();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearVisibilityTimer();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase, attemptId, handleExamViolation]);

  /* Integrity: fullscreen exit */
  useEffect(() => {
    if (phase !== "exam" || !attemptId) return;
    let armed = true;

    const onFs = () => {
      if (!armed) return;
      if (!document.fullscreenElement) {
        void handleExamViolation("Fullscreen exited during the exam");
      }
    };

    document.addEventListener("fullscreenchange", onFs);
    return () => {
      armed = false;
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [phase, attemptId, handleExamViolation]);

  /* Fullscreen tracking */
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    fn();
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  /* Before unload warning during exam */
  useEffect(() => {
    if (phase !== "exam") return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  /* Multi-tab: BroadcastChannel */
  useEffect(() => {
    if (!quizId || phase !== "exam") return;
    const ch = new BroadcastChannel(`lms-exam-${quizId}`);
    const id = tabLockId();
    ch.postMessage({ type: "alive", id });
    ch.onmessage = (ev) => {
      if (ev.data?.type === "alive" && ev.data?.id !== id && attemptId) {
        void handleExamViolation(
          "Multiple tabs detected. Opening a new tab is not allowed during the exam."
        );
      }
    };
    return () => ch.close();
  }, [quizId, phase, attemptId]);

  /* Camera probe on intro */
  useEffect(() => {
    if (phase !== "intro") return;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        s.getTracks().forEach((t) => t.stop());
        setCameraOk(true);
      })
      .catch(() => setCameraOk(false));
  }, [phase]);

  /* Microphone probe on intro */
  useEffect(() => {
    if (phase !== "intro") return;
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((s) => {
        s.getTracks().forEach((t) => t.stop());
        setMicOk(true);
      })
      .catch(() => setMicOk(false));
  }, [phase]);

  const handleStart = async () => {
    if (!quizId) return;
    try {
      // Re-check camera + microphone at the moment the user clicks Start.
      // This ensures permissions are actually available (not just probed earlier).
      let camStream: MediaStream | null = null;
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCameraOk(true);
      } catch {
        setCameraOk(false);
        setError("❌ Camera is required. Please:\n1. Enable camera in browser settings\n2. Check if another app is using the camera\n3. Try a different browser\nThen click Start again.");
        return;
      }

      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        micStream.getTracks().forEach((t) => t.stop());
        setMicOk(true);
      } catch {
        if (camStream) camStream.getTracks().forEach((t) => t.stop());
        setMicOk(false);
        setError("❌ Microphone is required. Please:\n1. Enable microphone in browser settings\n2. Check if another app is using the microphone\n3. Try a different browser\nThen click Start again.");
        return;
      }

      // Verify camera actually works by checking video stream
      if (camStream) {
        const video = document.createElement("video");
        video.srcObject = camStream;
        let isInitialized = false;
        
        await new Promise<void>((resolve) => {
          const onReady = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              isInitialized = true;
              video.removeEventListener("loadeddata", onReady);
              resolve();
            }
          };
          video.addEventListener("loadeddata", onReady);
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
          setTimeout(() => resolve(), 2000);
        });

        camStream.getTracks().forEach((t) => t.stop());

        if (!isInitialized) {
          setError("❌ Camera failed to initialize. Please:\n1. Check camera hardware is connected\n2. Restart your browser\n3. Try a different device\nThen click Start again.");
          return;
        }
      }

      const res = await quizAPI.startExam(quizId, tabLockId());
      const data = res?.data ?? res;
      setAttemptId(data.attemptId);
      setEndsAt(data.endsAt);
      setPhase("exam");

      // Request fullscreen after starting the attempt so the timer
      // is visible immediately (before fullscreen is fully entered).
      await document.documentElement.requestFullscreen().catch(() => {});
    } catch (e: any) {
      setError(e?.message || "Could not start exam");
    }
  };

  async function handleExamViolation(reason: string) {
    if (phase !== "exam") return;
    if (!attemptId) return;
    if (autoViolationSubmittedRef.current) return;

    console.log("[VIOLATION]", new Date().toISOString(), "Detected:", reason);

    // Face detection: multiple faces or no face detected = INSTANT FAILURE
    const isMultipleFaces = /multiple faces|multiple people|more than one face/i.test(reason);
    const isNoFace = /face not detected|face too|low confidence|low signal|face unavailable/i.test(reason) && !isMultipleFaces;

    console.log("[VIOLATION] isNoFace:", isNoFace, "isMultipleFaces:", isMultipleFaces);

    // Hard failures that terminate immediately
    const hardCameraIssue =
      /permission denied|camera stopped|camera not available|microphone|mic_denied|mic/i.test(reason);
    const hardMultiTabIssue = /multiple tabs|second tab|multi_tab/i.test(reason);

    // Multiple faces = instant termination
    if (isMultipleFaces) {
      console.warn("Multiple faces detected - instant termination");
      setIntegrityNotice(`❌ EXAM TERMINATED: Multiple people detected. Only one person is allowed.`);
      autoViolationSubmittedRef.current = true;
      setTerminationReason(reason);
      setSubmitting(true);
      try {
        const latest = answersRef.current;
        await quizAttemptAPI.save(attemptId, latest).catch(() => {});
        const res = await quizAttemptAPI.submit(attemptId, latest);
        const data = res?.data ?? res;
        setResult(data?.result);
        setReview(data?.review ?? []);
        setPhase("result");
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Integrity auto-submit failed");
      } finally {
        setSubmitting(false);
      }
      try {
        await quizAttemptAPI.log(attemptId, "face_violation", reason);
      } catch {}
      return;
    }

    violationStrikesRef.current += 1;
    console.log(`[VIOLATION] Strike ${violationStrikesRef.current}/3 recorded for:`, reason);

    // No face detected counts as strikes (fail on 3rd strike or hard issues)
    if (isNoFace) {
      // First 2 warnings, then fail on 3rd
      const strikeMessage = violationStrikesRef.current < 3
        ? `⚠️ Face detection failed (Strike ${violationStrikesRef.current}/3) - Keep your face visible in camera`
        : `❌ Face detection failed repeatedly. Exam terminated.`;
      console.log("[VIOLATION] Setting notice:", strikeMessage);
      setIntegrityNotice(strikeMessage);
    } else {
      console.log("[VIOLATION] Setting notice (non-face):", reason);
      setIntegrityNotice(
        `⚠️ ${reason} (Strike ${violationStrikesRef.current}/3) - Further issues will auto-submit your answers.`
      );
    }

    try {
      await quizAttemptAPI.log(attemptId, "integrity_notice", reason);
    } catch {
      /* ignore logging failures */
    }

    // For hard issues or repeated no-face we auto-submit immediately.
    if (!hardCameraIssue && !hardMultiTabIssue && !isNoFace && violationStrikesRef.current < 3) return;
    if (isNoFace && violationStrikesRef.current < 3) return;

    autoViolationSubmittedRef.current = true;
    setTerminationReason(reason);
    setSubmitting(true);

    try {
      // Submit the learner's already-attended answers so they still receive marks.
      const latest = answersRef.current;
      await quizAttemptAPI.save(attemptId, latest).catch(() => {});
      const res = await quizAttemptAPI.submit(attemptId, latest);
      const data = res?.data ?? res;
      setResult(data?.result);
      setReview(data?.review ?? []);
      setPhase("result");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Integrity auto-submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      const latest = answersRef.current;
      await quizAttemptAPI.save(attemptId, latest);
      const res = await quizAttemptAPI.submit(attemptId, latest);
      const data = res?.data ?? res;
      setResult(data?.result);
      setReview(data?.review ?? []);
      setPhase("result");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers]
  );
  const pct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !shell) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  const qz = shell?.quiz;

  /* Result only (already submitted) */
  if (phase === "result" && result && !review.length) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Exam submitted</CardTitle>
            {terminationReason && (
              <p className="text-sm font-medium text-destructive mt-1">{terminationReason}</p>
            )}
            <CardDescription>You have already completed this exam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Score: <strong>{result.score}</strong> / {result.total_points ?? qz?.total_points ?? 100}
            </p>
            <Button asChild variant="outline">
              <Link to="/courses">Back to courses</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (phase === "result" && result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6 pb-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
              (result.score ?? 0) >= (result.passing_score ?? 60) ? "bg-success/15" : "bg-warning/15"
            }`}
          >
            <Trophy className="h-10 w-10 text-accent" />
          </div>
          {terminationReason && (
            <p className="text-sm font-medium text-destructive">
              Session terminated: {terminationReason}
            </p>
          )}
          <h2 className="text-2xl font-bold">Results</h2>
          <p className="mt-2 text-4xl font-bold text-primary">
            {result.score} / {result.total_points ?? qz?.total_points ?? 100}
          </p>

        </div>

        <div className="space-y-3">
          {review.map((r: any, i: number) => (
            <Card key={r.id ?? i}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  Q{i + 1}. {r.prompt}
                </p>
                <div className="mt-2 space-y-1">
                  {r.options?.map((opt: string, oi: number) => (
                    <div
                      key={oi}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        oi === r.correctIndex
                          ? "bg-success/10 font-medium text-success"
                          : oi === r.selectedIndex && !r.isCorrect
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {opt}
                      {oi === r.correctIndex && <CheckCircle className="ml-1 inline h-4 w-4" />}
                      {oi === r.selectedIndex && !r.isCorrect && <XCircle className="ml-1 inline h-4 w-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button asChild className="w-full">
          <Link to="/courses">Back to courses</Link>
        </Button>
      </motion.div>
    );
  }

  /* Intro gate */
  if (phase === "intro") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-8 shadow-card">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" /> Secure exam
            </Badge>
            {qz?.available_from && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                Window enforced
              </Badge>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{qz?.title ?? "Exam"}</h1>
          <p className="text-muted-foreground">{qz?.course_title ?? "Course"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">
              <Clock className="mr-1 h-3.5 w-3.5" />
              {formatDuration(qz?.time_limit_minutes ?? 30)}
            </Badge>
            <Badge variant="outline">
              <Trophy className="mr-1 h-3.5 w-3.5" />
              {qz?.total_points ?? 100} marks
            </Badge>
            <Badge variant="outline">{questions.length} questions</Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Before you begin</CardTitle>
            <CardDescription>
              <ol className="list-decimal pl-5 space-y-1">
                <li>The exam will start only after you click the Start button.</li>
                <li>Once the exam starts, the timer cannot be paused.</li>
                <li>You must stay on the exam page until you finish. Avoid switching tabs or minimizing the window.</li>
                <li>The exam will run in fullscreen mode. Do not exit fullscreen during the test.</li>
                <li>Do not refresh or reload the page while the exam is in progress.</li>
                <li>Make sure your internet connection is stable before starting.</li>
                <li>Camera and microphone access may be required for monitoring. Please allow permission if requested.</li>
                <li>Face detection may be enabled. Your face must be clearly visible during the exam.</li>
                <li>If your face is not detected, if you move away, or if another person appears, a warning alert will be shown.</li>
                <li>Do not switch tabs, open other applications, or leave the screen. Violations may trigger alerts.</li>
                <li>Multiple warnings (tab switch / fullscreen exit / face not detected / camera off) may cause automatic submission of the exam.</li>
                <li>The exam will be submitted automatically when the time ends.</li>
                <li>Any suspicious activity may be recorded and reviewed by the instructor.</li>
                <li>Do not use unfair means, mobile phones, or external help during the exam.</li>
              </ol>

              <p className="mt-3">
                Click <span className="font-medium text-foreground">Start</span> when you are ready to begin.
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cameraOk === false && (
              <Alert variant="destructive">
                <AlertTitle>Camera required</AlertTitle>
                <AlertDescription>Allow camera access to start this exam.</AlertDescription>
              </Alert>
            )}
            {micOk === false && (
              <Alert variant="destructive">
                <AlertTitle>Microphone required</AlertTitle>
                <AlertDescription>Allow microphone access to start this exam.</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not start</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="h-12 w-full gap-2 text-base"
              onClick={() => void handleStart()}
              disabled={cameraOk !== true || micOk !== true}
            >
              <Maximize className="h-5 w-5" />
              Start exam (timer starts)
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/courses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  /* Active exam */
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const totalDurationMin = Number(qz?.time_limit_minutes) > 0 ? Number(qz.time_limit_minutes) : 30;
  const totalDurationSec = Math.round(totalDurationMin * 60);
  const elapsedSec = Math.min(totalDurationSec, Math.max(0, totalDurationSec - remainingSec));
  const timeProgressPct =
    totalDurationSec > 0 ? Math.min(100, Math.round((elapsedSec / totalDurationSec) * 100)) : 0;

  return (
    <motion.div className="mx-auto max-w-3xl space-y-6 pb-32">
      {attemptId && (
        <ExamProctor
          attemptId={attemptId}
          active={phase === "exam"}
          videoRef={videoRef}
          onNoFace={(reason) => void handleExamViolation(reason)}
        />
      )}

      {integrityNotice && phase === "exam" && (
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

      {!fullscreen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/90 p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Fullscreen required</CardTitle>
              <CardDescription>
                <div className="flex items-center justify-between gap-3">
                  <span>Enter fullscreen to continue.</span>
                  <span className="font-mono font-semibold">
                    {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => document.documentElement.requestFullscreen().catch(() => {})}>
                <Maximize className="mr-2 h-4 w-4" /> Enter fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{qz?.title}</h1>
          <p className="text-sm text-muted-foreground">{qz?.course_title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Exam duration: <span className="font-medium text-foreground">{formatDuration(totalDurationMin)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time remaining</span>
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xl font-bold tabular-nums ${
              remainingSec < 120 ? "border-destructive text-destructive" : "border-border"
            }`}
          >
            <Clock className="h-5 w-5 shrink-0" />
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatExamClock(elapsedSec)} elapsed · {formatExamClock(totalDurationSec)} total
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Exam time</span>
          <span className="tabular-nums text-muted-foreground">
            {timeProgressPct}% · {formatExamClock(elapsedSec)} / {formatExamClock(totalDurationSec)}
          </span>
        </div>
        <Progress value={timeProgressPct} className="h-2 bg-muted/60 [&>div]:bg-primary" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Question progress</span>
          <span>
            {answeredCount}/{questions.length}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">
              Question {idx + 1} <span className="text-muted-foreground">({q.points ?? 1} pts)</span>
            </CardTitle>
            <CardDescription className="text-foreground">{q.prompt}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[q.id] !== undefined ? String(answers[q.id]) : ""}
              onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
            >
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} />
                  <Label htmlFor={`${q.id}-${oi}`} className="flex-1 cursor-pointer">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-end gap-3">
          <Button variant="outline" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit exam"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ExamSession;
