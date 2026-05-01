import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { courses as mockCourses } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { courseAPI, dashboardAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";

const Courses = ({ view = "all" }: { view?: "all" | "my-enrolled" }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        if (view === "my-enrolled") {
          const res = await dashboardAPI.getEnrolledCourses();
          const list = Array.isArray(res?.data) ? res.data : [];
          setCourses(list);
        } else {
          const [allRes, enrolledRes] = await Promise.all([
            courseAPI.getAllCourses({ limit: 100, include_inactive: true }),
            dashboardAPI.getEnrolledCourses().catch(() => ({ data: [] })),
          ]);
          const rawList = Array.isArray(allRes?.data) ? allRes.data : [];
          const list = rawList.filter((c: any) => c.approval_status === "approved" || !c.approval_status);
          const enrolled = Array.isArray(enrolledRes?.data) ? enrolledRes.data : [];
          setCourses(list);
          setEnrolledIds(new Set(enrolled.map((c: any) => Number(c.id)).filter(Boolean)));
        }
      } catch {
        setCourses(view === "my-enrolled" ? [] : mockCourses);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [view]);

  const handleEnroll = async (e: React.MouseEvent, courseId: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setEnrollingId(courseId);
      await courseAPI.enrollInCourse(String(courseId));
      setEnrolledIds((prev) => new Set([...prev, courseId]));
      toast({ title: "Enrolled!", description: "You have successfully enrolled in this course." });
    } catch (err: any) {
      toast({ title: "Enrollment failed", description: err?.message || "Could not enroll.", variant: "destructive" });
    } finally {
      setEnrollingId(null);
    }
  };

  const categories = ["all", ...new Set(courses.map((c: any) => c.category).filter(Boolean))];
  const filtered = courses.filter((c: any) =>
    (category === "all" || c.category === category) &&
    (c.title || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isMyEnrolled = view === "my-enrolled";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{isMyEnrolled ? "My Courses" : "All Courses"}</h1>
        <p className="text-muted-foreground mt-1">
          {isMyEnrolled ? "Your enrolled courses with progress" : "Explore published courses and continue your learning"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                category === cat ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-card rounded-xl p-12 border border-border text-center">
            <p className="text-muted-foreground">
              {isMyEnrolled ? "You haven't enrolled in any courses yet." : "No published courses yet. Check back soon!"}
            </p>
            {isMyEnrolled && (
              <Link to="/courses" className="text-sm text-accent hover:underline font-medium mt-2 inline-block">Browse all courses</Link>
            )}
          </div>
        ) : (
          filtered.map((course: any, i: number) => {
            const courseId = Number(course.id);
            const isEnrolled = isMyEnrolled || enrolledIds.has(courseId);
            const isEnrolling = enrollingId === courseId;
            const isDeactivated = course?.is_active === false;

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={`bg-card rounded-xl overflow-hidden border border-border shadow-card hover:shadow-elevated transition-all duration-300 group ${isDeactivated ? "opacity-75" : ""}`}>
                  {isDeactivated ? (
                    <div className="block cursor-not-allowed">
                      <div className="h-40 overflow-hidden relative">
                        <img src={course.thumbnail || DEFAULT_THUMBNAIL} alt={course.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </div>
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-card/90 backdrop-blur text-xs font-medium text-foreground">
                          {course.duration || "—"}
                        </div>
                      </div>
                      <div className="p-5">
                        <span className="text-xs font-semibold text-accent uppercase tracking-wide">{course.category || ""}</span>
                        <h3 className="text-base font-semibold text-foreground mt-1.5">{course.title || "Course"}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{course.instructor || "—"}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{course?.module_count ?? 0} modules</span>
                          <span>{(course?.students ?? course?.enrolledCount ?? 0).toLocaleString()} students</span>
                        </div>
                        {isEnrolled && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold text-foreground">{course.progress_percentage ?? course.progress ?? 0}%</span>
                            </div>
                            <Progress value={course.progress_percentage ?? course.progress ?? 0} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                  <Link to={`/course/${course.id}`} className="block">
                    <div className="h-40 overflow-hidden relative">
                      <img src={course.thumbnail || DEFAULT_THUMBNAIL} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-card/90 backdrop-blur text-xs font-medium text-foreground">
                        {course.duration || "—"}
                      </div>
                    </div>
                    <div className="p-5">
                      <span className="text-xs font-semibold text-accent uppercase tracking-wide">{course.category || ""}</span>
                      <h3 className="text-base font-semibold text-foreground mt-1.5">{course.title || "Course"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{course.instructor || "—"}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{course?.module_count ?? 0} modules</span>
                        <span>{(course?.students ?? course?.enrolledCount ?? 0).toLocaleString()} students</span>
                      </div>
                      {isEnrolled && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold text-foreground">{course.progress_percentage ?? course.progress ?? 0}%</span>
                          </div>
                          <Progress value={course.progress_percentage ?? course.progress ?? 0} className="h-2" />
                        </div>
                      )}
                    </div>
                  </Link>
                  )}
                  <div className="px-5 pb-5 -mt-2">
                    {isDeactivated ? (
                      <Button className="w-full" size="sm" variant="outline" disabled>
                        <Lock className="w-4 h-4 mr-2" /> Locked
                      </Button>
                    ) : isEnrolled ? (
                      <Link to={`/course/${course.id}`} className="block">
                        <Button className="w-full" size="sm">Continue Learning</Button>
                      </Link>
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        variant="default"
                        disabled={isEnrolling}
                        onClick={(e) => handleEnroll(e, courseId)}
                      >
                        {isEnrolling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enrolling...</> : "Enroll"}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default Courses;
