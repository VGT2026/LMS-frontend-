import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  ExternalLink,
  BookOpen,
  BrainCircuit,
  ChevronRight,
} from "lucide-react";
import { courseAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { scopeRowsToTenant } from "@/utils/tenant";
import {
  mapApiToCourse,
  loadStoredSelection,
  saveStoredSelection,
  type RoadmapCourseItem,
} from "@/utils/roadmapAi";

const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";

const MIN_COURSES_FOR_AI = 2;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const CareerRoadmap = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [courses, setCourses] = useState<RoadmapCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(loadStoredSelection()));

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await courseAPI.getAllCourses({ limit: 100, include_inactive: true, tenant_id: user?.tenantId });
      const list = Array.isArray(res?.data) ? res.data : [];
      const approved = list.filter(
        (c: { approval_status?: string }) => c.approval_status === "approved" || !c.approval_status
      );
      // Safety net: only show courses from the user's organization.
      const { rows: scoped } = scopeRowsToTenant(
        approved as Record<string, unknown>[],
        user?.tenantId,
        user?.tenantName
      );
      const mapped = scoped
        .map((row: Record<string, unknown>) => mapApiToCourse(row))
        .filter((c): c is RoadmapCourseItem => c != null);
      setCourses(mapped);

      setSelectedIds((prev) => {
        const valid = new Set(mapped.map((c) => String(c.id)));
        const next = new Set<string>();
        for (const id of prev) {
          if (valid.has(id)) next.add(id);
        }
        return next;
      });
    } catch {
      setLoadError("No courses available");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, user?.tenantName]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    saveStoredSelection([...selectedIds]);
  }, [selectedIds]);

  const categories = useMemo(
    () => ["all", ...new Set(courses.map((c) => c.category).filter(Boolean) as string[])],
    [courses]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchCat = category === "all" || c.category === category;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [courses, search, category]);

  const toggleCourse = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAiGuide = () => {
    if (selectedIds.size < MIN_COURSES_FOR_AI) {
      toast({
        title: "Select more courses",
        description: `Choose at least ${MIN_COURSES_FOR_AI} courses to generate an AI learning guide.`,
        variant: "destructive",
      });
      return;
    }
    const ids = [...selectedIds]
      .sort((a, b) => Number(a) - Number(b))
      .join(",");
    navigate(`/roadmap/ai-help?courses=${ids}`);
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <motion.section
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="relative overflow-hidden rounded-3xl bg-gradient-hero text-primary-foreground p-8 sm:p-12 mb-10 shadow-elevated"
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-accent/40 blur-[100px]" />
        </div>
        <motion.div variants={fadeUp} className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">Career Roadmap</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Choose courses, get AI guidance
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-lg leading-relaxed">
            Browse every published course from your organization, pick the ones you care about, and AI will
            rank your selection plus suggest related courses from the same catalog.
          </p>
        </motion.div>
      </motion.section>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-card"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-foreground font-medium">{loadError}</p>
          <Button variant="outline" className="mt-4" onClick={() => void loadCourses()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          {courses.length === 0 ? "No courses available" : "No courses match your filters."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course, i) => {
            const checked = selectedIds.has(String(course.id));
            const courseId = String(course.id);
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  className={`bg-card rounded-2xl overflow-hidden border shadow-card transition-all duration-300 h-full flex flex-col ${
                    checked ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="h-40 overflow-hidden relative">
                    <img
                      src={course.thumbnail || DEFAULT_THUMBNAIL}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-card/95 backdrop-blur px-2 py-1.5 border border-border shadow-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCourse(courseId)}
                        aria-label={`Select ${course.title}`}
                      />
                      <span className="text-xs font-medium text-foreground">Select</span>
                    </div>
                    {course.category && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-semibold uppercase">
                        {course.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">{course.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border gap-2">
                      <span className="text-xs text-muted-foreground">{course.duration || "Self-paced"}</span>
                      <Button variant="ghost" size="sm" asChild className="gap-1 h-8 text-accent shrink-0">
                        <Link to={`/course/${course.id}`}>
                          Open
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="sticky bottom-4 z-40 mt-8 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-elevated"
          >
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedCount} course{selectedCount === 1 ? "" : "s"} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCount < MIN_COURSES_FOR_AI
                      ? `Select ${MIN_COURSES_FOR_AI - selectedCount} more for AI guidance`
                      : "Ready for your personalized study plan"}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 gap-2 font-semibold shadow-md shadow-accent/20"
                disabled={selectedCount < MIN_COURSES_FOR_AI}
                onClick={openAiGuide}
              >
                <BrainCircuit className="w-5 h-5" />
                AI Learning Guide
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CareerRoadmap;
