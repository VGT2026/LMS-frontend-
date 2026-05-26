import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronRight,
  Trophy,
  ListOrdered,
  ExternalLink,
} from "lucide-react";
import { aiAPI, courseAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  buildLocalRecommendation,
  buildStudyPlanSummary,
  mapApiToCourse,
  parseCourseIdsParam,
  rankSelectedCourses,
  type RoadmapCourseItem,
  type RoadmapRecommendation,
} from "@/utils/roadmapAi";

const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop";

const CareerRoadmapAIHelp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const courseIdsParam = searchParams.get("courses");
  const requestedIds = useMemo(() => parseCourseIdsParam(courseIdsParam), [courseIdsParam]);

  const [catalog, setCatalog] = useState<RoadmapCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [recommendation, setRecommendation] = useState<RoadmapRecommendation | null>(null);

  const selectedCourses = useMemo(() => {
    const byId = new Map(catalog.map((c) => [String(c.id), c] as const));
    return requestedIds.map((id) => byId.get(id)).filter((c): c is RoadmapCourseItem => !!c);
  }, [catalog, requestedIds]);

  useEffect(() => {
    if (requestedIds.length === 0) {
      navigate("/roadmap", { replace: true });
    }
  }, [requestedIds.length, navigate]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await courseAPI.getAllCourses({ limit: 100, include_inactive: true });
        const list = Array.isArray(res?.data) ? res.data : [];
        const approved = list.filter(
          (c: any) => c?.approval_status === "approved" || !c?.approval_status
        );
        const mapped = approved
          .map((row: Record<string, unknown>) => mapApiToCourse(row))
          .filter((c): c is RoadmapCourseItem => c != null);

        if (!cancelled) setCatalog(mapped);
      } catch {
        if (!cancelled) {
          toast({
            title: "Could not load courses",
            description: "Return to the roadmap and try again.",
            variant: "destructive",
          });
          setCatalog([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (loading) return;
    if (requestedIds.length === 0) return;
    if (selectedCourses.length === 0) return;

    if (selectedCourses.length !== requestedIds.length) {
      toast({
        title: "Some courses unavailable",
        description: "Removed courses are no longer published or no longer exist in your catalog.",
      });
    }

    let cancelled = false;
    const run = async () => {
      setAiLoading(true);
      setUsedFallback(false);
      try {
        const payload = await aiAPI.recommendRoadmap(selectedCourses.map((c) => c.id));

        if (cancelled) return;

        const byId = new Map(selectedCourses.map((c) => [String(c.id), c] as const));

        const answerText =
          typeof (payload as any)?.answer === "string"
            ? (payload as any).answer
            : typeof (payload as any)?.aiAnswer === "string"
              ? (payload as any).aiAnswer
              : "";

        const recommendedCourseId =
          (payload as any)?.recommendedCourseId ??
          (payload as any)?.recommended_course_id ??
          (payload as any)?.topPickCourseId ??
          (payload as any)?.top_pick_course_id;

        const topPick =
          byId.get(String(recommendedCourseId)) ?? selectedCourses[0];

        const rankedIdsRaw =
          (payload as any)?.ranked ??
          (payload as any)?.rankedCourseIds ??
          (payload as any)?.rankings ??
          [];

        const rankedIds = Array.isArray(rankedIdsRaw) ? rankedIdsRaw : [];
        const ranked = rankedIds
          .map((id: unknown) => byId.get(String(id)))
          .filter((c): c is RoadmapCourseItem => !!c);

        const studyOrderIdsRaw = (payload as any)?.studyOrder ?? (payload as any)?.study_order ?? [];
        const studyOrderIds = Array.isArray(studyOrderIdsRaw) ? studyOrderIdsRaw : [];
        const studyOrderCourses = studyOrderIds
          .map((id: unknown) => byId.get(String(id)))
          .filter((c): c is RoadmapCourseItem => !!c);

        const rankedToShow =
          ranked.length > 0 ? ranked : studyOrderCourses.length > 0 ? studyOrderCourses : rankSelectedCourses(selectedCourses);

        const summary = answerText || buildStudyPlanSummary(selectedCourses, topPick);

        setRecommendation({
          topPick,
          ranked: rankedToShow,
          studyOrder: studyOrderCourses.map((c) => c.id),
          summary,
        });
      } catch {
        if (cancelled) return;
        setUsedFallback(true);
        setRecommendation(buildLocalRecommendation(selectedCourses));
        toast({
          title: "Using offline ranking",
          description: "POST /ai/roadmap/recommend failed. Showing a local study order from your selected courses.",
        });
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [loading, requestedIds.length, selectedCourses, toast]);

  if (requestedIds.length === 0) return null;

  if (!loading && requestedIds.length > 0 && selectedCourses.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pb-12">
        <Button variant="ghost" asChild className="mb-6 gap-2 -ml-2">
          <Link to="/roadmap">
            <ArrowLeft className="w-4 h-4" />
            Back to course selection
          </Link>
        </Button>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-foreground font-medium">Selected courses not found</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Some or all selected course IDs are no longer available in the catalog.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/roadmap">Go back to /roadmap</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <Button variant="ghost" asChild className="mb-6 gap-2 -ml-2">
        <Link to="/roadmap">
          <ArrowLeft className="w-4 h-4" />
          Back to course selection
        </Link>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">AI Learning Guide</p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Your study plan</h1>
        <p className="text-muted-foreground mt-2">
          Based on {selectedCourses.length} course{selectedCourses.length === 1 ? "" : "s"} you selected
          {usedFallback ? " (offline ranking)" : ""}.
        </p>
      </motion.div>

      {loading || aiLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading courses…" : "Generating your personalized path…"}
          </p>
        </div>
      ) : !recommendation ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Could not build a recommendation. Go back and try again.</p>
          <Button asChild className="mt-4">
            <Link to="/roadmap">Back to roadmap</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-[#121214] border border-white/10 p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-white">AI guidance</h2>
                <p className="mt-3 text-white/80 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                  {recommendation.summary}
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border-2 border-accent bg-accent/5 p-6 shadow-md"
          >
            <div className="flex items-center gap-2 text-accent mb-4">
              <Trophy className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Best to start with</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <img
                src={recommendation.topPick.thumbnail || DEFAULT_THUMBNAIL}
                alt=""
                className="w-full sm:w-32 h-24 sm:h-28 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground">{recommendation.topPick.title}</h3>
                {recommendation.topPick.category && (
                  <p className="text-xs font-semibold text-accent uppercase mt-1">{recommendation.topPick.category}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{recommendation.topPick.description}</p>
                <Button asChild className="mt-4 bg-accent hover:bg-accent/90 gap-2">
                  <Link to={`/course/${recommendation.topPick.id}`}>
                    Start this course
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ListOrdered className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Recommended study order</h2>
            </div>
            <ol className="space-y-3">
              {recommendation.ranked.map((course, index) => (
                <li
                  key={course.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border bg-card ${
                    course.id === recommendation.topPick.id ? "border-accent/50" : "border-border"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      course.id === recommendation.topPick.id
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex gap-3 min-w-0 flex-1">
                    <img
                      src={course.thumbnail || DEFAULT_THUMBNAIL}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0 hidden sm:block"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{course.category || "Course"}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0 gap-1">
                    <Link to={`/course/${course.id}`}>
                      Open
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ol>
          </motion.section>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link to="/roadmap">
                <BookOpen className="w-4 h-4 mr-2" />
                Change selection
              </Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to={`/course/${recommendation.topPick.id}`}>Go to top pick</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerRoadmapAIHelp;
