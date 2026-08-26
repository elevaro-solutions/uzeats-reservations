/**
 * MHTML parser for DoorDash and Uber Eats restaurant pages.
 *
 * Extracts structured restaurant data that can be used to pre-fill
 * the restaurant creation/settings form.
 */

export interface ImportedMenuItem {
  name: string;
  description?: string;
  price?: number; // in cents
  category?: string;
  imageUrl?: string;
}

export interface ImportedRestaurantData {
  source: 'doordash' | 'ubereats' | 'unknown';
  name?: string;
  description?: string;
  cuisine?: string;
  priceRange?: number; // 1-4
  phone?: string;
  website?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  rating?: number;
  reviewCount?: number;
  menuCategories?: string[];
  menuItems?: ImportedMenuItem[];
  coverImageUrl?: string;
  hours?: string;
  /** Raw extracted text for debugging */
  rawText?: string;
}

/** Decode MIME quoted-printable encoding */
function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Strip HTML tags and decode basic entities */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function decodePartBody(part: string, rawBody: string): string {
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(part)) {
    return decodeQuotedPrintable(rawBody);
  }
  if (/Content-Transfer-Encoding:\s*base64/i.test(part)) {
    return Buffer.from(rawBody.replace(/\s/g, ''), 'base64').toString('utf-8');
  }
  return rawBody;
}

/** Extract the HTML body from MHTML content */
function extractHtmlFromMhtml(mhtmlContent: string): { html: string; sourceUrl: string } {
  const sourceUrlMatch = mhtmlContent.match(/Snapshot-Content-Location:\s*(.+)/i);
  const sourceUrl = sourceUrlMatch ? sourceUrlMatch[1]!.trim() : '';

  // Find the primary HTML part (first text/html section)
  const boundaryMatch = mhtmlContent.match(/boundary="([^"]+)"/);
  if (!boundaryMatch) {
    return { html: mhtmlContent, sourceUrl };
  }

  const boundary = boundaryMatch[1];
  const parts = mhtmlContent.split(`--${boundary}`);

  let best: { html: string; sourceUrl: string; score: number } | null = null;

  for (const part of parts) {
    if (!/Content-Type:\s*text\/html/i.test(part)) continue;

    const bodyStart = part.indexOf('\r\n\r\n');
    const altBodyStart = part.indexOf('\n\n');
    const start = bodyStart !== -1 ? bodyStart + 4 : altBodyStart !== -1 ? altBodyStart + 2 : 0;
    // Do NOT strip on interior `\n--` — DoorDash CSS vars like `--base-color-…` appear in the
    // HTML body and a greedy trim previously truncated the page to a shell (~26KB) with no menu.
    const rawBody = part.slice(start).replace(/\r?\n--\s*$/, '').replace(/\s+$/, '');
    const html = decodePartBody(part, rawBody);
    const loc = part.match(/Content-Location:\s*(.+)/i)?.[1]?.trim() ?? '';
    const score =
      html.length
      + (/MenuItem|StoreMenuItemPrice|data-category-scroll|store-item-|item-thumbnail-label/i.test(html) ? 1_000_000 : 0)
      + (/doordash\.com\/store|ubereats\.com\/store/i.test(loc) ? 100_000 : 0);

    if (!best || score > best.score) {
      best = {
        html,
        sourceUrl: loc || sourceUrl,
        score,
      };
    }
  }

  if (best) return { html: best.html, sourceUrl: best.sourceUrl || sourceUrl };

  return { html: mhtmlContent, sourceUrl };
}

/** Detect source platform from URL or page content */
function detectSource(sourceUrl: string, html: string): 'doordash' | 'ubereats' | 'unknown' {
  if (/doordash\.com/i.test(sourceUrl) || /doordash/i.test(html.slice(0, 2000))) {
    return 'doordash';
  }
  if (/ubereats\.com/i.test(sourceUrl) || /ubereats/i.test(html.slice(0, 2000))) {
    return 'ubereats';
  }
  return 'unknown';
}

/** Map common cuisines/tags to the app's cuisine list */
function normalizeCuisine(raw: string): string {
  const r = raw.toLowerCase();
  if (/uzbek|uyghur|central asian/i.test(r)) return 'Uzbek';
  if (/burger|american/i.test(r)) return 'American';
  if (/pizza|italian/i.test(r)) return 'Italian';
  if (/sushi|japanese/i.test(r)) return 'Japanese';
  if (/mexican|taco/i.test(r)) return 'Mexican';
  if (/chinese/i.test(r)) return 'Chinese';
  if (/indian/i.test(r)) return 'Indian';
  if (/mediterranean/i.test(r)) return 'Mediterranean';
  if (/thai/i.test(r)) return 'Thai';
  if (/seafood/i.test(r)) return 'Seafood';
  if (/turkish/i.test(r)) return 'Turkish';
  if (/korean/i.test(r)) return 'Korean';
  if (/vietnamese/i.test(r)) return 'Vietnamese';
  if (/greek/i.test(r)) return 'Greek';
  if (/french/i.test(r)) return 'French';
  if (/breakfast/i.test(r)) return 'American';
  return raw.trim();
}

/** Convert "$", "$$", "$$$" or numeric to 1-4 */
function parsePriceRange(raw: string): number {
  const dollars = (raw.match(/\$/g) ?? []).length;
  if (dollars >= 1 && dollars <= 4) return dollars;
  // numeric fallback
  const n = parseInt(raw, 10);
  if (n >= 1 && n <= 4) return n;
  return 2;
}

/** Parse a price string like "$10.49" → cents */
function parsePriceCents(raw: string): number | undefined {
  const m = raw.match(/\$?([\d]+\.?[\d]*)/);
  if (!m) return undefined;
  return Math.round(parseFloat(m[1]!) * 100);
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanInlineHtml(raw: string): string {
  return stripHtml(decodeHtmlEntities(raw)).replace(/\s+/g, ' ').trim();
}

function extractHttpImageUrl(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return undefined;
}

function extractCoverImageUrl(html: string): string | undefined {
  const metaPatterns = [
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i,
    /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i,
    /<meta[^>]+content="([^"]+)"[^>]+name="twitter:image"/i,
  ];

  for (const pattern of metaPatterns) {
    const match = extractHttpImageUrl(html.match(pattern)?.[1]);
    if (match) return match;
  }

  return undefined;
}

function extractFirstImageInBlock(block: string): string | undefined {
  const candidates: string[] = [];

  for (const match of block.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)) {
    const url = extractHttpImageUrl(match[1]);
    if (url) candidates.push(url);
  }

  for (const match of block.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of match[1]!.split(',')) {
      const url = extractHttpImageUrl(part.trim().split(/\s+/)[0]);
      if (url) candidates.push(url);
    }
  }

  const preferred = candidates.find((url) =>
    /tb-static\.uber\.com|cdn4dd\.com|img\.cdn4dd\.com|cloudfront\.net|uber\.com\/.*image/i.test(url),
  );
  return preferred ?? candidates[0];
}

function mergeMenuItems(...lists: ImportedMenuItem[][]): ImportedMenuItem[] {
  const byName = new Map<string, ImportedMenuItem>();

  for (const list of lists) {
    for (const item of list) {
      const key = item.name.trim().toLowerCase();
      if (!key) continue;
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, { ...item, name: item.name.trim() });
        continue;
      }
      if (!existing.imageUrl && item.imageUrl) existing.imageUrl = item.imageUrl;
      if (!existing.description && item.description) existing.description = item.description;
      if (existing.price == null && item.price != null) existing.price = item.price;
      if (!existing.category && item.category) existing.category = item.category;
    }
  }

  return Array.from(byName.values());
}

function collectMenuItemsFromJsonLd(
  node: unknown,
  out: ImportedMenuItem[],
  category?: string,
): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collectMenuItemsFromJsonLd(child, out, category);
    return;
  }

  const obj = node as Record<string, unknown>;
  const type = String(obj['@type'] ?? '');

  if (/MenuSection/i.test(type)) {
    const sectionName = typeof obj.name === 'string' ? obj.name : category;
    collectMenuItemsFromJsonLd(obj.hasMenuItem ?? obj.itemListElement, out, sectionName);
    return;
  }

  if (/MenuItem/i.test(type) && typeof obj.name === 'string') {
    const offer = obj.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    const offerObj = Array.isArray(offer) ? offer[0] : offer;
    const priceRaw = offerObj?.price ?? obj.price;
    const imageRaw = obj.image ?? obj.imageUrl;
    const image =
      typeof imageRaw === 'string'
        ? imageRaw
        : Array.isArray(imageRaw)
          ? String(imageRaw[0] ?? '')
          : imageRaw && typeof imageRaw === 'object' && 'url' in (imageRaw as object)
            ? String((imageRaw as { url?: string }).url ?? '')
            : undefined;

    out.push({
      name: obj.name,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      price: priceRaw != null ? parsePriceCents(String(priceRaw)) : undefined,
      category,
      imageUrl: extractHttpImageUrl(image),
    });
    return;
  }

  for (const key of ['hasMenu', 'hasMenuSection', 'hasMenuItem', '@graph', 'itemListElement']) {
    if (obj[key] != null) collectMenuItemsFromJsonLd(obj[key], out, category);
  }
}

function parseMenuItemsFromJsonLd(html: string): ImportedMenuItem[] {
  const items: ImportedMenuItem[] = [];
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      collectMenuItemsFromJsonLd(JSON.parse(match[1]!), items);
    } catch {
      /* ignore invalid JSON-LD blocks */
    }
  }
  return items;
}

/**
 * Uber Eats menu cards use data-testid="store-item-…" with rich-text spans and <picture>/<img>.
 */
function parseUberEatsMenuFromDom(html: string): ImportedMenuItem[] {
  const items: ImportedMenuItem[] = [];
  const itemSeen = new Set<string>();
  const markerRe = /data-testid=["'](store-item-[^"']+)["']/gi;
  const positions: number[] = [];
  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = markerRe.exec(html)) !== null) {
    positions.push(markerMatch.index);
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]!;
    const end = i + 1 < positions.length ? positions[i + 1]! : Math.min(start + 12_000, html.length);
    const block = html.slice(start, end);

    const richTexts = Array.from(
      block.matchAll(/data-testid=["']rich-text["'][^>]*>([\s\S]*?)<\/(?:span|div)>/gi),
    )
      .map((m) => cleanInlineHtml(m[1]!))
      .filter((t) => t.length > 0);

    let name: string | undefined;
    let price: number | undefined;
    let description: string | undefined;

    for (const text of richTexts) {
      if (/^\$[\d.]+/.test(text)) {
        if (price == null) price = parsePriceCents(text);
        continue;
      }
      if (/%/.test(text) || /^\([\d,]+\+?\)$/.test(text)) continue;
      if (!name) {
        name = text;
      } else if (!description && text.length >= 8 && text !== name) {
        description = text;
      }
    }

    if (!name) {
      const labelHtml = block.match(
        /data-testid=["']item-thumbnail-label["'][^>]*>([\s\S]*?)(?:<\/div>|data-testid=["']store-item-)/i,
      )?.[1];
      name = labelHtml ? cleanInlineHtml(labelHtml).split(/\$/)[0]?.trim() : undefined;
    }

    if (!name || name.length < 2 || itemSeen.has(name)) continue;
    if (/^(Skip|Enter|Chevron|Heart|Menu|Rating|Star|Arrow|Search|Group|Pickup|Schedule|Opens|Closed)/i.test(name)) {
      continue;
    }

    itemSeen.add(name);
    items.push({
      name,
      description,
      price,
      imageUrl: extractFirstImageInBlock(block),
    });
  }

  return items;
}

// ─── DoorDash Parser ──────────────────────────────────────────────────────────

const BULLET = String.raw`[•·⋅∙\u2022\u00b7]`;

function parseDoorDashAddressFromDescription(description: string): ImportedRestaurantData['address'] | undefined {
  // "… at 3518 Connecticut Avenue Northwest in Washington."
  const atIn = description.match(
    /\bat\s+(\d{1,5}\s+[A-Za-z0-9][^.]{5,80}?)\s+in\s+([A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\.|$)/i,
  );
  if (atIn) {
    return {
      line1: atIn[1]!.trim(),
      city: atIn[2]!.trim(),
      country: 'US',
    };
  }

  // "Joe's Burgers in Austin, TX"
  const inCityState = description.match(/\bin\s+([A-Za-z][A-Za-z\s.'-]{1,40}?),\s*([A-Z]{2})\b/);
  if (inCityState) {
    return { city: inCityState[1]!.trim(), state: inCityState[2]!, country: 'US' };
  }

  // Fallback: last "City, ST" occurrence
  const cityStateMatches = [...description.matchAll(/\b([A-Za-z][A-Za-z.'-]{1,40}),\s*([A-Z]{2})\b/g)];
  const last = cityStateMatches[cityStateMatches.length - 1];
  if (last) {
    return { city: last[1]!.trim(), state: last[2]!, country: 'US' };
  }

  return undefined;
}

function parseDoorDash(html: string, text: string): ImportedRestaurantData {
  const data: ImportedRestaurantData = { source: 'doordash' };
  data.coverImageUrl = extractCoverImageUrl(html);

  // Name: from <title> or heading
  const titleMatch = html.match(/<title[^>]*>Order\s+(.+?)\s*[-|]/i);
  if (titleMatch) {
    data.name = titleMatch[1]!.replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
  }

  // Rating e.g. "4.5 (2k+)" / "4.7 (1k+)"
  const ratingMatch = text.match(/(\d+\.\d+)\s*\((\d+[k+]*)\)/i);
  if (ratingMatch) {
    data.rating = parseFloat(ratingMatch[1]!);
    const countStr = ratingMatch[2]!.replace(/k/i, '000').replace('+', '');
    data.reviewCount = parseInt(countStr, 10);
  }

  // Price range from "$$" pattern
  const priceMatch = text.match(/\$\$+/);
  if (priceMatch) {
    data.priceRange = parsePriceRange(priceMatch[0]!);
  }

  // Cuisine tags — DoorDash lists them after rating e.g. "• Asian •" / "DashPass • Burgers"
  const cuisineMatch = text.match(
    new RegExp(`DashPass\\s*${BULLET}\\s*([^${BULLET}\\n]+?)(?:\\s*${BULLET}|$)`, 'i'),
  );
  if (cuisineMatch) {
    data.cuisine = normalizeCuisine(cuisineMatch[1]!.trim());
  } else {
    const titleCuisine = text.match(
      /(?:American|Burgers|Pizza|Mexican|Chinese|Japanese|Thai|Indian|Italian|Mediterranean|Seafood|Turkish|Korean|Uzbek|Uyghur|Asian)/i,
    );
    if (titleCuisine) data.cuisine = normalizeCuisine(titleCuisine[0]!);
  }

  // Location — DoorDash og:description is usually "… at STREET in CITY."
  const locationMatch =
    html.match(/<meta[^>]+property=["']og:description["'][^>]*content="([^"]+)"/i)
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+property=["']og:description["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]*content='([^']+)'/i)
    || html.match(/<meta[^>]+name=["']description["'][^>]*content="([^"]+)"/i);
  if (locationMatch) {
    data.address = parseDoorDashAddressFromDescription(decodeHtmlEntities(locationMatch[1]!));
  }

  // State from page text ("Washington, DC")
  const titleCityState = text.match(/\b([A-Za-z][A-Za-z\s]{1,30}),\s*([A-Z]{2})\b/);
  if (data.address && titleCityState) {
    if (!data.address.city) data.address.city = titleCityState[1]!.trim();
    if (!data.address.state) data.address.state = titleCityState[2]!;
  }

  const categoryMatches = Array.from(
    html.matchAll(/<h2[^>]*data-category-scroll-selector[^>]*>([\s\S]*?)<\/h2>/gi),
  )
    .map((match) => ({
      index: match.index ?? 0,
      name: cleanInlineHtml(match[1]!),
    }))
    .filter((category) => category.name.length > 0);

  const menuCategories: string[] = [];
  const seenCategories = new Set<string>();
  for (const category of categoryMatches) {
    if (!seenCategories.has(category.name)) {
      seenCategories.add(category.name);
      menuCategories.push(category.name);
    }
  }
  data.menuCategories = menuCategories;

  // DoorDash saves menu cards with explicit title, subtitle, and price markup.
  // Images usually appear after the price, so parse each MenuItem block directly.
  const menuItems: ImportedMenuItem[] = [];
  const itemSeen = new Set<string>();
  const menuItemMarker = 'data-testid="MenuItem"';
  let searchFrom = 0;

  for (const block of html.split(menuItemMarker).slice(1)) {
    const itemBlock = block.split(menuItemMarker)[0] ?? block;
    const itemIndex = html.indexOf(menuItemMarker, searchFrom);
    if (itemIndex === -1) break;
    searchFrom = itemIndex + menuItemMarker.length;

    const name = cleanInlineHtml(itemBlock.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '');
    if (!name || itemSeen.has(name)) continue;

    const descriptionRaw = itemBlock.match(
      /<span[^>]*data-telemetry-id="storeMenuItem.subtitle"[^>]*>([\s\S]*?)<\/span>/i,
    )?.[1];
    const description = descriptionRaw ? cleanInlineHtml(descriptionRaw) : undefined;
    const priceRaw = itemBlock.match(/data-testid="StoreMenuItemPrice"[^>]*>\$([\d.]+)/i)?.[1];
    const price = priceRaw ? parsePriceCents(priceRaw) : undefined;
    const imageUrl = extractFirstImageInBlock(itemBlock);

    let category: string | undefined;
    for (const categoryMatch of categoryMatches) {
      if (categoryMatch.index <= itemIndex) {
        category = categoryMatch.name;
      } else {
        break;
      }
    }

    itemSeen.add(name);
    menuItems.push({ name, description, price, category, imageUrl });
  }

  if (menuItems.length > 0) {
    data.menuItems = menuItems.slice(0, 200);
    if (!data.description) {
      const topItems = menuItems.slice(0, 3).map((i) => i.name).join(', ');
      data.description = `Authentic ${data.cuisine ?? 'restaurant'} cuisine. Popular dishes include: ${topItems}.`;
    }
  }

  // Operating hours e.g. "11:30 am - 9:25 pm"
  const hoursMatch = text.match(
    /(\d{1,2}:\d{2}\s*(?:am|pm))\s*[–\-—-]\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i,
  );
  if (hoursMatch) data.hours = `${hoursMatch[1]!} – ${hoursMatch[2]!}`;

  return data;
}

// ─── Uber Eats Parser ─────────────────────────────────────────────────────────

function parseUberEats(html: string, text: string): ImportedRestaurantData {
  const data: ImportedRestaurantData = { source: 'ubereats' };
  data.coverImageUrl = extractCoverImageUrl(html);

  // Name from title
  const titleMatch = html.match(/<title[^>]*>Order\s+(.+?)\s*[-|]/i);
  if (titleMatch) {
    data.name = titleMatch[1]!.replace(/&#39;/g, "'").trim();
  }

  // Rating "4.6 x (2,000+)"
  const ratingMatch = text.match(/(\d+\.\d+)\s*(?:x\s*)?\(?([\d,]+)\+?\)?/i);
  if (ratingMatch) {
    data.rating = parseFloat(ratingMatch[1]!);
    data.reviewCount = parseInt(ratingMatch[2]!.replace(/,/g, ''), 10);
  }

  // Address — Uber Eats shows it directly e.g. "3518 Connecticut Ave Nw, Washington, DC 20008"
  // Require the street number to be a standalone token (not preceded by : or digits, ruling out times like "11:30 AM • ... 3518")
  // Strategy: find every candidate match and pick the first one whose preceding char is not a digit or colon
  const addressCandidates = text.matchAll(/(?<![:\d])(\b\d{1,5}\s+[A-Za-z][^,\n]{3,50}),\s*([A-Za-z][A-Za-z\s]{1,30}),\s*([A-Z]{2})\s*(\d{5})/g);
  let addressMatch: RegExpMatchArray | null = null;
  for (const m of addressCandidates) {
    addressMatch = m;
    break;
  }
  if (addressMatch) {
    data.address = {
      line1: addressMatch[1]!.trim(),
      city: addressMatch[2]!.trim(),
      state: addressMatch[3]!.trim(),
      zip: addressMatch[4]!.trim(),
      country: 'US',
    };
  }

  // Cuisine — from tags or title keywords
  const cuisineMatch = text.match(/(?:Uyghur|Uzbek|American|Italian|Mexican|Japanese|Chinese|Indian|Mediterranean|Thai|Turkish|Korean|Greek|French|Seafood)/i);
  if (cuisineMatch) data.cuisine = normalizeCuisine(cuisineMatch[0]!);

  // Menu categories
  const menuCats: string[] = [];
  const catPattern = /\b(Featured items|Picked for you|Appetizers|Chef'?s? Specialties|Rice\s*&\s*Noodles|Special Product|Vegetarian Dishes|Kebabs|Dessert|Bakery Bags|Coffee|Beverages|Entrees|Sandwiches|Salads|Sides|Drinks|Specials)\b/gi;
  let catMatch;
  const seen = new Set<string>();
  while ((catMatch = catPattern.exec(text)) !== null) {
    const cat = catMatch[0].trim();
    if (!seen.has(cat)) { seen.add(cat); menuCats.push(cat); }
  }
  data.menuCategories = menuCats;

  // Prefer structured DOM / JSON-LD (includes item images). Fall back to plain-text prices.
  const textMenuItems: ImportedMenuItem[] = [];
  const itemPattern = /([A-Z][^\n$]{3,60}?)\s+\$([\d.]+)(?:\s*•\s*[\d]+%\s*\([\d,]+\))?/g;
  let itemMatch;
  const itemSeen = new Set<string>();
  while ((itemMatch = itemPattern.exec(text)) !== null) {
    const name = itemMatch[1]!.trim();
    if (itemSeen.has(name) || name.length < 3) continue;
    if (/^(Skip|Enter|Chevron|Heart|Menu|Rating|Star|Arrow|Search|Group|Pickup|Schedule|Opens|Closed|Featured|Picked)/i.test(name)) continue;
    itemSeen.add(name);
    textMenuItems.push({ name, price: parsePriceCents(itemMatch[2]!) });
  }

  const menuItems = mergeMenuItems(
    parseUberEatsMenuFromDom(html),
    parseMenuItemsFromJsonLd(html),
    textMenuItems,
  );
  data.menuItems = menuItems.slice(0, 200);

  const categoriesFromItems = Array.from(
    new Set(menuItems.map((item) => item.category).filter((c): c is string => Boolean(c))),
  );
  if (categoriesFromItems.length > 0) {
    data.menuCategories = Array.from(new Set([...menuCats, ...categoriesFromItems]));
  }

  // Build description from top-rated items
  if (menuItems.length > 0) {
    const topItems = menuItems.slice(0, 3).map((i) => i.name).join(', ');
    data.description = `Authentic ${data.cuisine ?? 'restaurant'} cuisine. Popular dishes include: ${topItems}.`;
  }

  // Operating hours
  const hoursMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (hoursMatch) data.hours = `${hoursMatch[1]!} – ${hoursMatch[2]!}`;

  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isSupportedDeliveryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      (host === 'doordash.com'
        || host.endsWith('.doordash.com')
        || host === 'ubereats.com'
        || host.endsWith('.ubereats.com'))
      && /\/store\//i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function normalizeDeliveryUrl(url: string): string {
  const parsed = new URL(url.trim());
  parsed.hash = '';
  return parsed.toString();
}

/**
 * Parse saved HTML (MHTML body, standalone HTML export, or fetched page HTML).
 */
export function parseRestaurantHtml(html: string, sourceUrl = ''): ImportedRestaurantData {
  const text = stripHtml(html);
  const source = detectSource(sourceUrl, html);

  if (source === 'doordash') {
    return parseDoorDash(html, text);
  }
  if (source === 'ubereats') {
    return parseUberEats(html, text);
  }

  const data: ImportedRestaurantData = { source: 'unknown' };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) data.name = stripHtml(titleMatch[1]!).replace(/\s*[-|].*$/, '').trim();
  data.rawText = text.slice(0, 500);
  return data;
}

/**
 * Parse an MHTML file buffer and return structured restaurant data.
 * Supports DoorDash and Uber Eats formats.
 */
export function parseMhtmlRestaurant(mhtmlBuffer: Buffer): ImportedRestaurantData {
  const mhtmlContent = mhtmlBuffer.toString('utf-8');
  const { html, sourceUrl } = extractHtmlFromMhtml(mhtmlContent);
  return parseRestaurantHtml(html, sourceUrl);
}

export function parseRestaurantFile(buffer: Buffer, filename = ''): ImportedRestaurantData {
  const content = buffer.toString('utf-8');
  const lowerName = filename.toLowerCase();
  const isMhtml =
    lowerName.endsWith('.mhtml')
    || lowerName.endsWith('.mht')
    || /multipart\/related/i.test(content.slice(0, 500))
    || /Snapshot-Content-Location:/i.test(content.slice(0, 500));

  if (isMhtml) {
    return parseMhtmlRestaurant(buffer);
  }

  return parseRestaurantHtml(content);
}
