/** Max dishes a restaurant can mark popular for the public details page. */
export const MAX_POPULAR_MENU_ITEMS = 10;

/** When no items are marked popular, show this many on the public page. */
export const FALLBACK_PUBLIC_MENU_ITEMS = 8;

type MenuItemLike = { popular?: boolean | null };

type MenuSectionLike = {
  items?: MenuItemLike[] | null;
};

export function countPopularMenuItems(
  sections: Array<MenuSectionLike> | null | undefined,
): number {
  return (sections ?? []).reduce(
    (n, section) => n + (section.items ?? []).filter((item) => item.popular).length,
    0,
  );
}

/**
 * Public restaurant pages only list curated popular dishes (up to 10).
 * If none are marked, fall back to the first few items so unconfigured
 * menus still preview something.
 */
export function selectPublicMenuSections<S extends { items?: MenuItemLike[] | null }>(
  sections: S[],
): Array<S & { items: NonNullable<S['items']> }> {
  const usePopular = countPopularMenuItems(sections) > 0;
  let remaining = usePopular ? MAX_POPULAR_MENU_ITEMS : FALLBACK_PUBLIC_MENU_ITEMS;

  return sections
    .map((section) => {
      const source = (section.items ?? []).filter((item) => (usePopular ? item.popular : true));
      const items = source.slice(0, Math.max(0, remaining)) as NonNullable<S['items']>;
      remaining -= items.length;
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}
