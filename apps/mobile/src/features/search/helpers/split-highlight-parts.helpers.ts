function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type HighlightPart = {
  text: string;
  matched: boolean;
};

export function splitHighlightParts(
  text: string,
  query: string,
): HighlightPart[] {
  const trimmed = query.trim();
  if (!trimmed) return [{ text, matched: false }];

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part) => ({
    text: part,
    matched: part.toLowerCase() === trimmed.toLowerCase(),
  }));
}
