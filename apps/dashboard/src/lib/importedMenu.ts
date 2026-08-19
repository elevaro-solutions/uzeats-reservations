type ImportedMenuItem = {
  name: string;
  description?: string;
  price?: number;
  category?: string;
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
};

type MenuSectionInput = {
  name: string;
  items: MenuItemInput[];
};

export function buildMenuSectionsFromImport(data: ImportedRestaurantData): MenuSectionInput[] {
  const items = data.menuItems ?? [];
  const sectionMap = new Map<string, MenuItemInput[]>();
  const seenBySection = new Map<string, Set<string>>();

  for (const item of items) {
    const name = String(item.name ?? '').trim();
    if (!name) continue;

    const sectionName = String(item.category ?? '').trim() || 'Imported items';
    const normalizedKey = name.toLowerCase();
    const namesInSection = seenBySection.get(sectionName) ?? new Set<string>();
    if (namesInSection.has(normalizedKey)) continue;

    namesInSection.add(normalizedKey);
    seenBySection.set(sectionName, namesInSection);

    const sectionItems = sectionMap.get(sectionName) ?? [];
    sectionItems.push({
      name,
      description: String(item.description ?? '').trim(),
      priceCents: Number.isFinite(item.price) ? Math.max(0, Math.round(item.price!)) : 0,
      dietary: [],
      available: true,
    });
    sectionMap.set(sectionName, sectionItems);
  }

  return Array.from(sectionMap.entries()).map(([name, sectionItems]) => ({
    name,
    items: sectionItems,
  }));
}
