/** Career roadmap AI helpers — API courses only (numeric DB ids). */

import { getCourseThumbnail } from "@/utils/course";

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
  /** Ranked courses from the user's selection only. */
  ranked: RoadmapCourseItem[];
  /** Additional catalog courses related to the selection (not selected). */
  related: RoadmapCourseItem[];
  studyOrder: number[];
  summary: string;
  /** Per-course explanation from AI (courseId → reason). */
  courseReasons: Record<number, string>;
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
    thumbnail: getCourseThumbnail(raw),
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

/** Offline-only: reasons derived from each course’s metadata (not fixed copy). */
export function buildLocalCourseReason(
  course: RoadmapCourseItem,
  isTopPick: boolean
): string {
  if (isTopPick) {
    const level = course.level ? ` (${course.level})` : "";
    const cat = course.category ? ` in ${course.category}` : "";
    return `"${course.title}"${level} is the strongest starting point among your selection${cat}.`;
  }
  const bits: string[] = [];
  if (course.level) bits.push(course.level);
  if (course.category) bits.push(course.category);
  if (course.duration) bits.push(course.duration);
  if (bits.length) return `Supports your path with ${bits.join(" · ")}.`;
  const snippet = course.description?.slice(0, 100).trim();
  return snippet
    ? `${snippet}${course.description.length > 100 ? "…" : ""}`
    : `Complements your other selected courses.`;
}

/** Offline: suggest catalog courses in same categories as the selection. */
export function buildLocalRelatedCourses(
  selected: RoadmapCourseItem[],
  catalog: RoadmapCourseItem[],
  limit = 4
): RoadmapCourseItem[] {
  const selectedIds = new Set(selected.map((c) => c.id));
  const categories = new Set(
    selected.map((c) => c.category?.toLowerCase()).filter((c): c is string => !!c)
  );
  const topCategory = selected[0]?.category?.toLowerCase();

  const scored = catalog
    .filter((c) => !selectedIds.has(c.id))
    .map((c) => {
      const cat = c.category?.toLowerCase();
      let score = 0;
      if (cat && categories.has(cat)) score += 4;
      if (topCategory && cat === topCategory) score += 2;
      if (c.level === "Beginner" || c.level === "beginner") score += 1;
      score += Math.min(2, Math.floor((c.description?.length ?? 0) / 80));
      return { course: c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title));

  return scored.slice(0, limit).map((x) => x.course);
}

export function buildLocalRelatedReason(
  course: RoadmapCourseItem,
  selected: RoadmapCourseItem[]
): string {
  const match = selected.find(
    (s) => s.category && course.category && s.category.toLowerCase() === course.category.toLowerCase()
  );
  if (match) {
    return `Pairs well with your selection (e.g. "${match.title}") — same focus on ${course.category}.`;
  }
  const snippet = course.description?.slice(0, 90).trim();
  return snippet
    ? `Recommended to broaden your path: ${snippet}${course.description.length > 90 ? "…" : ""}`
    : "Recommended based on topics in your selected courses.";
}

export function buildLocalRecommendation(
  selected: RoadmapCourseItem[],
  catalog: RoadmapCourseItem[] = selected
): RoadmapRecommendation {
  const ranked = rankSelectedCourses(selected);
  const topPick = ranked[0];
  const related = buildLocalRelatedCourses(selected, catalog);
  const courseReasons: Record<number, string> = {};
  for (const c of ranked) {
    courseReasons[c.id] = buildLocalCourseReason(c, c.id === topPick.id);
  }
  for (const c of related) {
    courseReasons[c.id] = buildLocalRelatedReason(c, selected);
  }
  const relatedNote =
    related.length > 0
      ? ` You may also explore ${related.map((c) => `"${c.title}"`).join(", ")} from your catalog.`
      : "";
  return {
    topPick,
    ranked,
    related,
    studyOrder: ranked.map((c) => c.id),
    summary: buildStudyPlanSummary(selected, topPick) + relatedNote,
    courseReasons,
  };
}

function readReason(row: Record<string, unknown>): string | undefined {
  for (const key of ["reason", "why", "explanation", "rationale", "summary"]) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function mergeReasons(
  target: Record<number, string>,
  id: number,
  reason: string | undefined,
  byId: Map<number, RoadmapCourseItem>
) {
  if (!reason || !byId.has(id)) return;
  target[id] = reason;
}

function pickCourseById(
  id: unknown,
  catalogById: Map<number, RoadmapCourseItem>
): RoadmapCourseItem | undefined {
  const n = Number(id);
  if (!Number.isFinite(n)) return undefined;
  return catalogById.get(n);
}

function collectCourseIdsFromArray(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

function parseCourseListFromPayload(
  raw: unknown,
  catalogById: Map<number, RoadmapCourseItem>,
  courseReasons: Record<number, string>
): RoadmapCourseItem[] {
  const out: RoadmapCourseItem[] = [];
  for (const item of collectCourseIdsFromArray(raw)) {
    if (typeof item === "number" || typeof item === "string") {
      const c = pickCourseById(item, catalogById);
      if (c) out.push(c);
    } else if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      const c = pickCourseById(row.courseId ?? row.course_id ?? row.id, catalogById);
      if (c) {
        out.push(c);
        mergeReasons(courseReasons, c.id, readReason(row), catalogById);
      }
    }
  }
  return out;
}

function unwrapRecommendRoot(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const root = data as Record<string, unknown>;
  let inner: unknown = root.data ?? root.result ?? root.recommendation ?? root;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const row = inner as Record<string, unknown>;
    if (row.recommendation && typeof row.recommendation === "object") {
      inner = row.recommendation;
    } else if (row.data && typeof row.data === "object") {
      inner = row.data;
    }
  }
  return inner && typeof inner === "object" && !Array.isArray(inner)
    ? (inner as Record<string, unknown>)
    : root;
}

/** Map backend recommend payload; resolves courses from full catalog. */
export function parseRecommendApiResponse(
  data: unknown,
  selected: RoadmapCourseItem[],
  catalog: RoadmapCourseItem[] = selected
): RoadmapRecommendation | null {
  if (!selected.length) return null;
  const selectedIdSet = new Set(selected.map((c) => c.id));
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const raw = unwrapRecommendRoot(data);
  const courseReasons: Record<number, string> = {};

  const topRaw =
    raw.topPick ??
    raw.top_pick ??
    raw.recommendedCourse ??
    raw.recommended_course ??
    (typeof raw.recommendedCourseId !== "undefined" ? { courseId: raw.recommendedCourseId } : null) ??
    (typeof raw.recommended_course_id !== "undefined" ? { course_id: raw.recommended_course_id } : null) ??
    (typeof raw.topPickCourseId !== "undefined" ? { courseId: raw.topPickCourseId } : null) ??
    (typeof raw.top_pick_course_id !== "undefined" ? { course_id: raw.top_pick_course_id } : null);

  let topPick: RoadmapCourseItem | undefined;
  if (topRaw && typeof topRaw === "object") {
    const t = topRaw as Record<string, unknown>;
    const id = t.courseId ?? t.course_id ?? t.id;
    topPick = pickCourseById(id, catalogById);
    if (topPick) mergeReasons(courseReasons, topPick.id, readReason(t), catalogById);
  } else {
    topPick = pickCourseById(topRaw, catalogById);
  }

  const rankedRaw =
    raw.ranked ?? raw.rankings ?? raw.recommendedOrder ?? raw.rankedCourseIds;
  const rankedFromApi = parseCourseListFromPayload(rankedRaw, catalogById, courseReasons);

  const relatedRaw =
    raw.related ??
    raw.relatedCourses ??
    raw.related_courses ??
    raw.suggestedCourses ??
    raw.suggested_courses ??
    raw.additionalCourses ??
    raw.additional_courses ??
    raw.moreCourses ??
    raw.more_courses ??
    raw.recommendedMore ??
    raw.recommended_more;
  const relatedFromApi = parseCourseListFromPayload(relatedRaw, catalogById, courseReasons);

  const reasonsMap = raw.reasons ?? raw.courseReasons ?? raw.course_reasons;
  if (reasonsMap && typeof reasonsMap === "object" && !Array.isArray(reasonsMap)) {
    for (const [key, val] of Object.entries(reasonsMap as Record<string, unknown>)) {
      const id = Number(key);
      if (Number.isFinite(id) && typeof val === "string") {
        mergeReasons(courseReasons, id, val.trim(), catalogById);
      }
    }
  }

  const rankedSelected: RoadmapCourseItem[] = [];
  const related: RoadmapCourseItem[] = [];
  const relatedSeen = new Set<number>();

  const pushRelated = (c: RoadmapCourseItem) => {
    if (selectedIdSet.has(c.id) || relatedSeen.has(c.id)) return;
    relatedSeen.add(c.id);
    related.push(c);
  };

  const pushSelected = (c: RoadmapCourseItem) => {
    if (!selectedIdSet.has(c.id)) {
      pushRelated(c);
      return;
    }
    if (!rankedSelected.some((r) => r.id === c.id)) rankedSelected.push(c);
  };

  for (const c of rankedFromApi) pushSelected(c);
  for (const c of relatedFromApi) pushRelated(c);

  const studyOrderRaw = raw.studyOrder ?? raw.study_order;
  if (Array.isArray(studyOrderRaw)) {
    for (const id of studyOrderRaw) {
      const c = pickCourseById(id, catalogById);
      if (c) pushSelected(c);
    }
  }

  if (!topPick) {
    topPick = rankedSelected[0] ?? rankSelectedCourses(selected)[0];
  }
  if (!topPick) return null;

  const ordered: RoadmapCourseItem[] = [];
  const seenSelected = new Set<number>();
  const pushOrdered = (c: RoadmapCourseItem) => {
    if (!selectedIdSet.has(c.id) || seenSelected.has(c.id)) return;
    seenSelected.add(c.id);
    ordered.push(c);
  };

  if (selectedIdSet.has(topPick.id)) pushOrdered(topPick);
  for (const c of rankedSelected) pushOrdered(c);
  for (const c of selected) pushOrdered(c);
  if (!ordered.length) {
    for (const c of rankSelectedCourses(selected)) pushOrdered(c);
  }

  let relatedFinal = related;
  if (relatedFinal.length === 0 && catalog.length > selected.length) {
    relatedFinal = buildLocalRelatedCourses(selected, catalog);
    for (const c of relatedFinal) {
      if (!courseReasons[c.id]) {
        courseReasons[c.id] = buildLocalRelatedReason(c, selected);
      }
    }
  }

  const summary =
    typeof raw.answer === "string" && raw.answer.trim()
      ? raw.answer.trim()
      : typeof raw.aiAnswer === "string" && raw.aiAnswer.trim()
        ? raw.aiAnswer.trim()
        : typeof raw.summary === "string" && raw.summary.trim()
          ? raw.summary.trim()
          : typeof raw.advice === "string" && raw.advice.trim()
            ? raw.advice.trim()
            : typeof raw.message === "string" && raw.message.trim()
              ? raw.message.trim()
              : buildStudyPlanSummary(selected, topPick);

  return {
    topPick,
    ranked: ordered,
    related: relatedFinal,
    studyOrder: ordered.map((c) => c.id),
    summary,
    courseReasons,
  };
}

export function getCourseRecommendationReason(
  recommendation: RoadmapRecommendation,
  course: RoadmapCourseItem,
  options?: { useOfflineHeuristic?: boolean }
): string | undefined {
  const fromApi = recommendation.courseReasons[course.id]?.trim();
  if (fromApi) return fromApi;
  if (!options?.useOfflineHeuristic) return undefined;
  return buildLocalCourseReason(course, course.id === recommendation.topPick.id);
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
