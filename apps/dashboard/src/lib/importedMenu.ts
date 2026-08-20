type ImportedMenuItem = {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  imageUrl?: string;
};

type ImportedRestaurantData = {
  menuItems?: ImportedMenuItem[];
};

type MenuItemInput = {
  name: string;
  description: string;
  priceCents: number;
  dietary: string[];
  available: boolean;
  photoUrl?: string;
};

type MenuSectionInput = {
  name: string;
  items: MenuItemInput[];
};

export async function buildMenuSectionsFromImport(
  data: ImportedRestaurantData,
  options?: {
    resolvePhotoUrl?: (item: ImportedMenuItem, itemIndex: number) => Promise<string | undefined>;
  },
): Promise<MenuSectionInput[]> {
  const items = data.menuItems ?? [];
  const sectionMap = new Map<string, MenuItemInput[]>();
  const seenBySection = new Map<string, Set<string>>();
  let itemIndex = 0;

  for (const item of items) {
    const name = String(item.name ?? '').trim();
    if (!name) continue;

    const sectionName = String(item.category ?? '').trim() || 'Imported items';
    const normalizedKey = name.toLowerCase();
    const namesInSection = seenBySection.get(sectionName) ?? new Set<string>();
    if (namesInSection.has(normalizedKey)) continue;

    namesInSection.add(normalizedKey);
    seenBySection.set(sectionName, namesInSection);

    const photoUrl = options?.resolvePhotoUrl
      ? await options.resolvePhotoUrl(item, itemIndex)
      : undefined;

    const sectionItems = sectionMap.get(sectionName) ?? [];
    sectionItems.push({
      name,
      description: String(item.description ?? '').trim(),
      priceCents: Number.isFinite(item.price) ? Math.max(0, Math.round(item.price!)) : 0,
      dietary: [],
      available: true,
      photoUrl,
    });
    sectionMap.set(sectionName, sectionItems);
    itemIndex += 1;
  }

  return Array.from(sectionMap.entries()).map(([name, sectionItems]) => ({
    name,
    items: sectionItems,
  }));
}
