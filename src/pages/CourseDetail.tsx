import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, FileText, Download, CheckCircle, Circle, ArrowLeft, Clock, Users, Loader2, BookOpen, ClipboardList } from "lucide-react";
import { courseAPI, enrollmentAPI, quizAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";

const tabs = ["Overview", "Modules", "Assignments", "Quizzes", "Discussions", "Resources"];

interface LessonDetail {
  id: number;
  title: string;
  video_url?: string;
  pdf_url?: string;
  duration?: number;
}

interface ModuleItem {
  id: number;
  title: string;
  description?: string;
  pdf_url?: string;
  lessons: number;
  lessonDetails?: LessonDetail[];
}

const CourseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<{
    id: string;
    title: string;
    description?: string;
    category?: string;
    instructor?: string;
    thumbnail?: string;
    duration?: string;
    students?: number;
    modules?: ModuleItem[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState("Modules");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid course ID");
      return;
    }
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await courseAPI.getCourseById(id);
        const d = res?.data ?? res?.course ?? res;
        if (!d || typeof d !== "object") {
          setError("Course not found");
          setCourse(null);
          return;
        }
        const modules: ModuleItem[] = Array.isArray(d.modules)
          ? d.modules.map((m: any) => ({
              id: Number(m.id),
              title: String(m.title ?? ""),
              description: m.description,
              pdf_url: m.pdf_url,
              lessons: m.lessons ?? (Array.isArray(m.lessonDetails) ? m.lessonDetails.length : 0),
              lessonDetails: Array.isArray(m.lessonDetails)
                ? m.lessonDetails.map((l: any) => ({
                    id: Number(l.id),
                    title: String(l.title ?? ""),
                    video_url: l.video_url,
                    pdf_url: l.pdf_url,
                    duration: l.duration,
                  }))
                : [],
            }))
          : [];
        setCourse({
          id: String(d.id),
          title: String(d.title ?? ""),
          description: d.description,
          category: d.category,
          instructor: d.instructor,
          thumbnail: d.thumbnail || DEFAULT_THUMBNAIL,
          duration: d.duration,
          students: d.students ?? d.enrolledCount ?? 0,
          modules,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course");
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  // Load enrollment progress for enrolled students
  useEffect(() => {
    if (!id || !course || user?.role !== "student") return;
    const loadEnrollment = async () => {
      try {
        const res = await enrollmentAPI.getEnrollmentByCourse(id);
        const data = res?.data ?? res;
        const completed = data?.completed_lessons;
        if (Array.isArray(completed) && completed.length > 0) {
          setCompletedLessons(new Set(completed.map(String)));
        }
        setIsEnrolled(true);
      } catch {
        // Not enrolled - progress stays local only
        setIsEnrolled(false);
      }
    };
    loadEnrollment();
  }, [id, course, user?.role]);

  const toggleComplete = useCallback((moduleId: string) => {
    const modules = course?.modules ?? [];
    const totalModules = modules.length;
    setCompletedLessons((prev) => {
      const updated = new Set(prev);
      if (updated.has(moduleId)) updated.delete(moduleId);
      else updated.add(moduleId);
      const completedList = Array.from(updated);

      // Persist to backend when user is student (API returns 404 if not enrolled)
      if (id && user?.role === "student") {
        setSavingProgress(true);
        enrollmentAPI.updateProgress(id, completedList, totalModules)
          .then(() => setSavingProgress(false))
          .catch((err) => {
            setSavingProgress(false);
            // Don't toast for 404 (not enrolled) - progress stays local
            const msg = err instanceof Error ? err.message : "";
            if (msg && !msg.includes("404") && !msg.toLowerCase().includes("not enrolled")) {
              toast({
                title: "Error",
                description: msg || "Failed to save progress",
                variant: "destructive",
              });
            }
          });
      }
      return updated;
    });
  }, [course?.modules, id, user?.role, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
        <div className="bg-card rounded-xl p-12 border border-border text-center">
          <p className="text-muted-foreground">{error || "Course not found"}</p>
        </div>
      </div>
    );
  }

  const modules = course.modules ?? [];
  const progress = modules.length > 0
    ? Math.round((completedLessons.size / modules.length) * 100)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl">
      <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden h-48 md:h-56">
        <img src={course.thumbnail || DEFAULT_THUMBNAIL} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <span className="text-xs font-semibold text-accent uppercase tracking-wide">{course.category || "Course"}</span>
          <h1 className="text-2xl md:text-3xl font-bold text-card mt-1">{course.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-card/80">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {(course.students ?? 0).toLocaleString()} students</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.duration || "—"}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Course Progress</span>
          <span className="text-sm font-bold text-accent">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "Overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-6 border border-border shadow-card">
          <h2 className="text-lg font-semibold text-foreground mb-3">About This Course</h2>
          <p className="text-muted-foreground leading-relaxed">{course.description || "No description available."}</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Instructor</p><p className="text-sm font-medium text-foreground mt-0.5">{course.instructor || "—"}</p></div>
            <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Duration</p><p className="text-sm font-medium text-foreground mt-0.5">{course.duration || "—"}</p></div>
            <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Modules</p><p className="text-sm font-medium text-foreground mt-0.5">{modules.length}</p></div>
            <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Students</p><p className="text-sm font-medium text-foreground mt-0.5">{(course.students ?? 0).toLocaleString()}</p></div>
          </div>
        </motion.div>
      )}

      {activeTab === "Modules" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {modules.length === 0 ? (
            <div className="bg-card rounded-xl p-12 border border-border text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No modules available yet. Check back soon.</p>
            </div>
          ) : (
            modules.map((mod, idx) => {
              const modId = String(mod.id);
              const lessons = mod.lessonDetails ?? [];
              const isCompleted = completedLessons.has(modId);
              const lessonCount = mod.lessons || lessons.length;

              return (
                <div key={mod.id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium ${
                        isCompleted ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{mod.title}</p>
                        <p className="text-sm text-muted-foreground">{lessonCount} lesson{lessonCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {mod.pdf_url && (
                        <a href={mod.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                            <Download className="w-3.5 h-3.5" /> PDF
                          </Button>
                        </a>
                      )}
                      {isCompleted ? (
                        <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600" disabled>
                          <CheckCircle className="w-3.5 h-3.5" /> Done
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => toggleComplete(modId)} className="h-8 text-xs gap-1.5" disabled={savingProgress}>
                          {savingProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Circle className="w-3.5 h-3.5" />}
                          {savingProgress ? "Saving..." : "Mark Complete"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {lessons.length > 0 && (
                    <div className="ml-11 space-y-1.5 border-l-2 border-muted pl-4">
                      {lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Play className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-foreground truncate">{lesson.title}</span>
                            {lesson.duration != null && <span className="text-xs text-muted-foreground flex-shrink-0">{lesson.duration} min</span>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {lesson.video_url && (
                              <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 text-xs px-2">Watch</Button>
                              </a>
                            )}
                            {lesson.pdf_url && (
                              <a href={lesson.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1"><FileText className="w-3 h-3" /> PDF</Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {activeTab === "Assignments" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/assignments" className="block">
            <div className="bg-card rounded-xl p-6 border border-border shadow-card">
              <h3 className="font-semibold text-foreground">Assignments</h3>
              <p className="text-sm text-muted-foreground mt-1">View and submit your assignments.</p>
              <Button className="mt-4" size="sm">View Assignments</Button>
            </div>
          </Link>
        </motion.div>
      )}

      {activeTab === "Quizzes" && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onAnimationStart={() => {
            if (!quizzesLoaded && id) {
              setQuizzesLoaded(true);
              quizAPI.list()
                .then(res => {
                  const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
                  setQuizzes(raw.filter((q: any) => Number(q?.course_id) === Number(id)));
                })
                .catch(() => setQuizzes([]));
            }
          }}
          className="space-y-3"
        >
          {quizzes.length === 0 ? (
            <div className="bg-card rounded-xl p-12 border border-border text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No quizzes available yet.</p>
              {!isEnrolled && <p className="text-xs text-muted-foreground mt-1">Enroll in this course to access quizzes.</p>}
            </div>
          ) : (
            quizzes.map((q: any) => (
              <Link key={q.id} to={`/exam/${q.id}`} className="block">
                <div className="bg-card rounded-xl p-5 border border-border shadow-card hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{q.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {q.time_limit && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {q.time_limit} min</span>}
                          <span>{q.total_points ?? 0} pts</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" className="flex-shrink-0">Start</Button>
                  </div>
                </div>
              </Link>
            ))
          )}
        </motion.div>
      )}

      {activeTab === "Discussions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/discussions" className="block">
            <div className="bg-card rounded-xl p-6 border border-border shadow-card">
              <p className="text-muted-foreground">View course discussions →</p>
            </div>
          </Link>
        </motion.div>
      )}

      {activeTab === "Resources" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {(() => {
            const modulePdfs = modules.filter((m) => m.pdf_url).map((m) => ({ title: m.title, url: m.pdf_url!, type: "Module" }));
            const lessonPdfs = modules.flatMap((m) =>
              (m.lessonDetails ?? []).filter((l) => l.pdf_url).map((l) => ({ title: `${m.title} – ${l.title}`, url: l.pdf_url!, type: "Lesson" }))
            );
            const allPdfs = [...modulePdfs, ...lessonPdfs];
            if (allPdfs.length === 0) {
              return (
                <div className="bg-card rounded-xl p-12 border border-border text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No PDF resources available for this course.</p>
                </div>
              );
            }
            return allPdfs.map((item) => (
              <div key={item.url} className="bg-card rounded-xl p-4 border border-border shadow-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">({item.type})</span>
                  </div>
                </div>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </a>
              </div>
            ));
          })()}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CourseDetail;
