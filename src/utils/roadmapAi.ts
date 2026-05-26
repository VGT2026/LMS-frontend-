/** Career roadmap AI helpers — API courses only (numeric DB ids). */

export interface RoadmapCourseItem {
  id: number;
  title: string;
  description: string;
  category?: string;
  duration?: string;
  thumbnail?: string;
  level?: string;
}

export interface RoadmapRecommendation {
  topPick: RoadmapCourseItem;
  ranked: RoadmapCourseItem[];
  studyOrder: number[];
  summary: string;
}

export function mapApiToCourse(raw: Record<string, unknown>): RoadmapCourseItem | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    title: String(raw.title ?? "Untitled course"),
    description: String(raw.description ?? "").trim() || "No description available.",
    category: raw.category != null ? String(raw.category) : undefined,
    duration: raw.duration != null ? String(raw.duration) : undefined,
    thumbnail: raw.thumbnail != null ? String(raw.thumbnail) : undefined,
    level: raw.level != null ? String(raw.level) : undefined,
  };
}

export function parseCourseIdsParam(param: string | null): string[] {
  if (!param?.trim()) return [];
  return [
    ...new Set(
      param
        .split(",")
        .map((s) => s.trim())
        .map((s) => (Number.isFinite(Number(s)) ? String(Number(s)) : ""))
        .filter((s) => !!s && Number(s) > 0)
    ),
  ];
}

/** Local fallback ranking when POST /ai/roadmap/recommend is unavailable. */
export function rankSelectedCourses(courses: RoadmapCourseItem[]): RoadmapCourseItem[] {
  return [...courses].sort((a, b) => {
    const score = (c: RoadmapCourseItem) =>
      (c.description.length > 80 ? 3 : c.description.length > 20 ? 2 : 1) +
      (c.category ? 2 : 0) +
      (c.level === "Beginner" || c.level === "beginner" ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
}

export function buildStudyPlanSummary(courses: RoadmapCourseItem[], topPick: RoadmapCourseItem): string {
  const rest = courses.filter((c) => c.id !== topPick.id).map((c) => c.title);
  const tail = rest.length ? ` Then continue with ${rest.join(", ")}.` : "";
  return `Start with "${topPick.title}" — it is the best entry point among your selection based on topic breadth and course metadata.${tail}`;
}

export function buildLocalRecommendation(selected: RoadmapCourseItem[]): RoadmapRecommendation {
  const ranked = rankSelectedCourses(selected);
  const topPick = ranked[0];
  return {
    topPick,
    ranked,
    studyOrder: ranked.map((c) => c.id),
    summary: buildStudyPlanSummary(selected, topPick),
  };
}

function pickCourseById(
  id: unknown,
  byId: Map<number, RoadmapCourseItem>
): RoadmapCourseItem | undefined {
  const n = Number(id);
  if (!Number.isFinite(n)) return undefined;
  return byId.get(n);
}

/** Map backend recommend payload; only returns courses from `selected`. */
export function parseRecommendApiResponse(
  data: unknown,
  selected: RoadmapCourseItem[]
): RoadmapRecommendation | null {
  if (!selected.length) return null;
  const byId = new Map(selected.map((c) => [c.id, c]));
  const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  const topRaw =
    raw.topPick ??
    raw.top_pick ??
    (typeof raw.recommendedCourseId !== "undefined" ? { courseId: raw.recommendedCourseId } : null) ??
    (typeof raw.recommended_course_id !== "undefined" ? { course_id: raw.recommended_course_id } : null);

  let topPick: RoadmapCourseItem | undefined;
  if (topRaw && typeof topRaw === "object") {
    const t = topRaw as Record<string, unknown>;
    topPick = pickCourseById(t.courseId ?? t.course_id ?? t.id, byId);
  } else {
    topPick = pickCourseById(topRaw, byId);
  }

  const rankedRaw = raw.ranked ?? raw.rankings ?? raw.recommendedOrder;
  const ranked: RoadmapCourseItem[] = [];

  if (Array.isArray(rankedRaw)) {
    for (const item of rankedRaw) {
      if (typeof item === "number" || typeof item === "string") {
        const c = pickCourseById(item, byId);
        if (c) ranked.push(c);
      } else if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const c = pickCourseById(row.courseId ?? row.course_id ?? row.id, byId);
        if (c) ranked.push(c);
      }
    }
  }

  const studyOrderRaw = raw.studyOrder ?? raw.study_order;
  if (Array.isArray(studyOrderRaw) && studyOrderRaw.length > 0) {
    for (const id of studyOrderRaw) {
      const c = pickCourseById(id, byId);
      if (c && !ranked.some((r) => r.id === c.id)) ranked.push(c);
    }
  }

  if (!topPick) {
    topPick = ranked[0] ?? rankSelectedCourses(selected)[0];
  }
  if (!topPick || !byId.has(topPick.id)) return null;

  const ordered: RoadmapCourseItem[] = [];
  const seen = new Set<number>();
  const push = (c: RoadmapCourseItem) => {
    if (!seen.has(c.id) && byId.has(c.id)) {
      seen.add(c.id);
      ordered.push(c);
    }
  };

  push(topPick);
  for (const c of ranked) push(c);
  for (const c of selected) push(c);

  const summary =
    typeof raw.summary === "string"
      ? raw.summary
      : typeof raw.advice === "string"
        ? raw.advice
        : typeof raw.message === "string"
          ? raw.message
          : buildStudyPlanSummary(selected, topPick);

  return {
    topPick,
    ranked: ordered,
    studyOrder: ordered.map((c) => c.id),
    summary,
  };
}

export const ROADMAP_SELECTION_STORAGE_KEY = "lms_roadmap_selected";

export function loadStoredSelection(): string[] {
  try {
    const raw = sessionStorage.getItem(ROADMAP_SELECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter((s) => {
      const n = Number(s);
      return Number.isFinite(n) && n > 0;
    });
  } catch {
    return [];
  }
}

export function saveStoredSelection(ids: string[]) {
  try {
    sessionStorage.setItem(ROADMAP_SELECTION_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
