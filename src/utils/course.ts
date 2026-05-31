/**
 * Resolve a course thumbnail/image URL from an API row, tolerating the many
 * field names backends use (thumbnail, thumbnail_url, image, image_url,
 * cover_image, etc.) plus nested `course` objects. Returns undefined when no
 * usable URL is present so callers can fall back to a default image.
 */
export function getCourseThumbnail(
  row: Record<string, unknown> | null | undefined
): string | undefined {
  if (!row || typeof row !== "object") return undefined;

  const candidateKeys = [
    "thumbnail",
    "thumbnail_url",
    "thumbnailUrl",
    "image",
    "image_url",
    "imageUrl",
    "cover_image",
    "coverImage",
    "cover_image_url",
    "cover",
    "banner",
    "banner_url",
    "picture",
    "photo",
  ];

  const pick = (obj: Record<string, unknown>): string | undefined => {
    for (const key of candidateKeys) {
      const val = obj[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
    return undefined;
  };

  const direct = pick(row);
  if (direct) return direct;

  // Some payloads nest the course under `course`.
  const nested = row.course;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return pick(nested as Record<string, unknown>);
  }

  return undefined;
}
