import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, ArrowLeft, ArrowRight, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { quizAPI, quizAttemptAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProctoringOverlay } from "@/components/proctoring/ProctoringOverlay";
import { Progress } from "@/components/ui/progress";

interface QuizQuestion {
  id: string | number;
  question: string;
  options: string[];
  type: 'multiple_choice' | 'short_answer';
  points?: number;
}

interface QuestionFeedback {
  question_id: string | number;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  explanation?: string;
  student_answer?: string;
}

interface QuizAttempt {
  id: number;
  quiz_id: number;
  user_id: number;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  answers_json: Record<string, any>;
  is_active: boolean;
  time_spent_seconds: number;
  tab_switches: number;
  violations: string[];
}

interface QuizExam {
  id: number;
  title: string;
  description?: string;
  time_limit?: number;
  total_points?: number;
  passing_score?: number;
  allow_review?: boolean;
  show_answers?: boolean;
  questions: QuizQuestion[];
  current_attempt?: QuizAttempt;
}

const Quiz = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [quiz, setQuiz] = useState<QuizExam | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [violationReason, setViolationReason] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<QuestionFeedback[]>([]);
  const [reviewData, setReviewData] = useState<any[]>([]);
  const autosaveRef = useRef<NodeJS.Timeout>();
  const handleAutoSubmitRef = useRef<() => Promise<void>>();

  // Load quiz and start attempt
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        if (!quizId) {
          toast({ title: "Error", description: "Quiz ID is required", variant: "destructive" });
          return;
        }

        // Get exam (quiz + questions without answers)
        const examRes = await quizAPI.getExam(quizId);
        const examData = examRes?.data || examRes;
        console.log("📋 Quiz loaded:", examData);
        setQuiz(examData);

        // If student already has an attempt, load it
        if (examData.current_attempt) {
          const attemptData = examData.current_attempt;
          setAttempt(attemptData);
          setAnswers(attemptData.answers_json || {});
          console.log("📝 Loaded existing attempt:", attemptData);
        } else {
          // Start new attempt
          const startRes = await quizAPI.startExam(quizId);
          const attempt = startRes?.data || startRes;
          setAttempt(attempt);
          console.log("✅ New attempt started:", attempt);
        }

        // Set initial time left
        if (examData.time_limit) {
          setTimeLeft(examData.time_limit * 60); // Convert to seconds
        }
      } catch (error) {
        console.error("Failed to load quiz:", error);
        toast({ title: "Error", description: "Could not load quiz", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId, toast]);

  // Timer
  useEffect(() => {
    if (submitted || !attempt || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out — use ref to avoid stale closure
          handleAutoSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submitted, attempt]);

  // Autosave answers every 10 seconds
  useEffect(() => {
    if (!attempt || submitted || Object.keys(answers).length === 0) return;

    autosaveRef.current = setInterval(async () => {
      try {
        await quizAttemptAPI.save(attempt.id, answers);
        console.log("💾 Answers autosaved");
      } catch (error) {
        console.error("Autosave failed:", error);
      }
    }, 10000);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [attempt, answers, submitted]);

  const handleViolation = async (reason: string) => {
    console.log("⚠️ Violation detected:", reason);
    setViolationReason(reason);

    // Log violation on backend — guard against null attempt
    if (attempt) {
      try {
        await quizAttemptAPI.log(attempt.id, "violation", reason);
      } catch (error) {
        console.error("Failed to log violation:", error);
      }
    }

    // Auto-submit
    await handleAutoSubmitRef.current?.();
  };

  const handleAutoSubmit = async () => {
    if (!attempt || submitted) return;
    setSubmitted(true);
    await submitQuiz();
  };

  // Keep ref in sync with latest handleAutoSubmit to avoid stale closures in timer
  handleAutoSubmitRef.current = handleAutoSubmit;

  const selectAnswer = (questionId: string | number, value: any) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [String(questionId)]: value,
    }));
  };

  const submitQuiz = async () => {
    if (!attempt) return;

    try {
      setSubmitting(true);
      console.log("📤 Submitting quiz with answers:", answers);

      const submitRes = await quizAttemptAPI.submit(attempt.id, answers);
      const result = submitRes?.data || submitRes;

      console.log("✅ Quiz submitted, result:", result);
      setScore(result.result?.score);
      
      // Store AI feedback and review data
      if (result.feedback) {
        setFeedback(result.feedback);
        console.log("📊 AI Feedback received:", result.feedback);
      }
      if (result.review) {
        setReviewData(result.review);
        console.log("📝 Review data received:", result.review);
      }
      
      toast({
        title: "Quiz Submitted",
        description: `You scored ${result.result?.score || 0} points!`,
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      toast({ title: "Error", description: "Failed to submit quiz", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quiz || !attempt) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl p-8 border border-border shadow-card text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Quiz not found or could not be loaded.</p>
          <Button onClick={() => navigate(`/courses/${courseId}`)} className="mt-6">
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  const q = quiz.questions?.[currentQuestion];
  const answered = Object.keys(answers).length;
  const totalQuestions = quiz.questions?.length || 0;

  // Results screen
  if (submitted) {
    const passed = score !== null && score >= (quiz.passing_score || 0);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card rounded-xl p-8 border border-border shadow-card text-center">
          {violationReason ? (
            <>
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-destructive/10">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mt-4">Session Terminated</h2>
              <p className="text-destructive font-semibold mt-2">Violation Detected</p>
              <p className="text-muted-foreground mt-1">{violationReason}</p>
              <p className="text-xs text-muted-foreground mt-4">Your quiz has been automatically submitted. Score: 0</p>
            </>
          ) : (
            <>
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${passed ? "bg-success/10" : "bg-warning/10"}`}>
                {passed ? (
                  <CheckCircle className="w-10 h-10 text-success" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-warning" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mt-4">Quiz Complete!</h2>
              <p className="text-4xl font-bold mt-2" style={{ color: passed ? "var(--success)" : "var(--warning)" }}>
                {score}/{quiz.total_points || totalQuestions}
              </p>
              <p className="text-muted-foreground mt-1">
                {passed ? "Great job! You passed the quiz." : "Keep studying and try again."}
              </p>
              {quiz.allow_review && quiz.show_answers && (
                <p className="text-xs text-muted-foreground mt-4">
                  Review section below shows correct answers
                </p>
              )}
            </>
          )}
        </div>

        {!violationReason && (quiz.allow_review || feedback.length > 0) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Review & AI Feedback</h3>
            {quiz.questions?.map((q, idx) => {
              // Find feedback for this question
              const questionFeedback = feedback.find(f => String(f.question_id) === String(q.id));
              const reviewItem = reviewData.find(r => String(r.id) === String(q.id));
              
              return (
                <div key={q.id} className="bg-card rounded-xl p-4 border border-border shadow-card">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-foreground text-sm">
                      {idx + 1}. {q.question}
                    </p>
                    {questionFeedback && (
                      <div className="flex items-center gap-2 ml-4">
                        {questionFeedback.is_correct ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-success" />
                            <span className="text-xs font-semibold text-success">
                              {questionFeedback.points_earned}/{questionFeedback.max_points} pts
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-destructive" />
                            <span className="text-xs font-semibold text-destructive">
                              {questionFeedback.points_earned}/{questionFeedback.max_points} pts
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Feedback/Explanation */}
                  {questionFeedback?.explanation && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
                      questionFeedback.is_correct
                        ? "bg-success/10 text-success border border-success/20"
                        : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                    }`}>
                      <p className="font-semibold mb-1">
                        {questionFeedback.is_correct ? "✓ Correct!" : "Feedback:"}
                      </p>
                      <p>{questionFeedback.explanation}</p>
                    </div>
                  )}

                  {/* Multiple Choice Options Display */}
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const wasSelected = answers[String(q.id)] === optIdx;
                        const isCorrectAnswer = optIdx === reviewItem?.correctIndex;
                        
                        return (
                          <div
                            key={optIdx}
                            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                              isCorrectAnswer
                                ? "bg-success/10 text-success border border-success/30"
                                : wasSelected
                                ? "bg-destructive/10 text-destructive border border-destructive/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {opt}
                            {isCorrectAnswer && <CheckCircle className="w-4 h-4 ml-auto" />}
                            {wasSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer Display */}
                  {q.type === 'short_answer' && questionFeedback?.student_answer && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Your Answer:</p>
                      <p className="text-sm text-foreground">{questionFeedback.student_answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Button onClick={() => navigate(`/courses/${courseId}`)} className="w-full">
          Back to Course
        </Button>
      </motion.div>
    );
  }

  // Quiz taking screen
  if (!q) {
    return (
      <div className="text-center text-muted-foreground">
        No questions available
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <ProctoringOverlay isActive={!submitted} onViolation={handleViolation} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
          {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border">
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          {quiz.time_limit && (
            <p className="text-xs text-muted-foreground mt-2">
              Time limit: {quiz.time_limit} min
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentQuestion + 1} of {totalQuestions}
          </span>
          <span className="text-muted-foreground">
            {answered} answered
          </span>
        </div>
        <Progress value={(currentQuestion + 1) / totalQuestions * 100} className="h-2" />
      </div>

      {/* Progress dots */}
      <div className="flex gap-1">
        {quiz.questions?.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentQuestion(idx)}
            title={`Question ${idx + 1}`}
            className={`h-2 flex-1 rounded-full transition-colors ${
              idx === currentQuestion
                ? "bg-primary"
                : answers[String(_.id)] !== undefined
                ? "bg-accent"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-card">
        <p className="text-xs text-muted-foreground mb-2">Question {currentQuestion + 1} of {totalQuestions}</p>
        <h2 className="text-lg font-semibold text-foreground mb-5">{q.question}</h2>

        {q.type === "multiple_choice" ? (
          <div className="space-y-2">
            {q.options?.map((opt, optIdx) => (
              <button
                key={optIdx}
                onClick={() => selectAnswer(q.id, optIdx)}
                disabled={submitted}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  answers[String(q.id)] === optIdx
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground hover:border-primary/40 hover:bg-muted/50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-current mr-3 text-xs">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <Textarea
            placeholder="Type your answer here..."
            value={answers[String(q.id)] || ""}
            onChange={(e) => selectAnswer(q.id, e.target.value)}
            disabled={submitted}
            rows={4}
            className="resize-none"
          />
        )}

        {q.points && (
          <p className="text-xs text-muted-foreground mt-4">
            Points: {q.points}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0 || submitted}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </Button>

        {currentQuestion < totalQuestions - 1 ? (
          <Button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            disabled={submitted}
            className="gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={submitted || submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Quiz"}
          </Button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-xl p-6 border border-border shadow-elevated max-w-sm w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-foreground">Submit Quiz?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              You've answered {answered} of {totalQuestions} questions. This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  setShowConfirm(false);
                  await submitQuiz();
                }}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Quiz;
