const storageKey = (userId: string) => `lms_roadmap_${userId}`;

export function loadRoadmapFromStorage(userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function saveRoadmapToStorage(userId: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
}

/** User-selected path, then local backup, then role default from mock job role. */
export function getEffectiveRoadmapIds(
  user: { id: string; roadmapCourseIds?: string[] } | null | undefined,
  roleDefaultRoadmap: string[]
): string[] {
  if (user?.roadmapCourseIds?.length) return [...user.roadmapCourseIds];
  if (user) {
    const stored = loadRoadmapFromStorage(user.id);
    if (stored?.length) return stored;
  }
  return [...roleDefaultRoadmap];
}

export function mapCourseToRoadmapItem(
  id: string,
  apiCourses: Array<{ id?: string | number; title?: string; description?: string; duration?: string; category?: string }>,
  mockCourses: Array<{ id: string; title: string; description: string; duration?: string; category?: string }>
) {
  const sid = String(id);
  const fromApi = apiCourses.find((c) => String(c.id) === sid);
  if (fromApi) {
    return {
      id: sid,
      title: fromApi.title || "Untitled course",
      description: fromApi.description || "No description available.",
      duration: fromApi.duration || "Self-paced",
      category: fromApi.category,
    };
  }
  const fromMock = mockCourses.find((c) => c.id === sid);
  if (fromMock) {
    return {
      id: sid,
      title: fromMock.title,
      description: fromMock.description,
      duration: fromMock.duration || "12 weeks",
      category: fromMock.category,
    };
  }
  return {
    id: sid,
    title: "Course module",
    description: "Course details will appear once synced from the catalog.",
    duration: "Self-paced",
    category: undefined as string | undefined,
  };
}
