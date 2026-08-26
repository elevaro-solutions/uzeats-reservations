import { isSafeInternalPath } from "@reservations/shared";
import { Href } from "expo-router";

export function resolveAuthNextPath(
  next: string | string[] | undefined,
): Href {
  const value = Array.isArray(next) ? next[0] : next;
  if (isSafeInternalPath(value)) {
    return value as Href;
  }
  return "/(tabs)";
}

export function goAfterAuth(
  replace: (href: Href) => void,
  next: string | string[] | undefined,
) {
  replace(resolveAuthNextPath(next));
}
