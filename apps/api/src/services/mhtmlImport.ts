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

  for (const part of parts) {
    if (part.includes('Content-Type: text/html')) {
      const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
      const bodyStart = part.indexOf('\r\n\r\n');
      const altBodyStart = part.indexOf('\n\n');
      const start = bodyStart !== -1 ? bodyStart + 4 : altBodyStart !== -1 ? altBodyStart + 2 : 0;
      const rawBody = part.slice(start);
      const html = isQP ? decodeQuotedPrintable(rawBody) : rawBody;
      return { html, sourceUrl };
    }
  }

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
  const imgMatch = block.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  return extractHttpImageUrl(imgMatch);
}

// ─── DoorDash Parser ──────────────────────────────────────────────────────────

function parseDoorDash(html: string, text: string): ImportedRestaurantData {
  const data: ImportedRestaurantData = { source: 'doordash' };
  data.coverImageUrl = extractCoverImageUrl(html);

  // Name: from <title> or heading
  const titleMatch = html.match(/<title[^>]*>Order\s+(.+?)\s*[-|]/i);
  if (titleMatch) {
    data.name = titleMatch[1]!.replace(/&#39;/g, "'").trim();
  }

  // Rating e.g. "4.5 (2k+)"
  const ratingMatch = text.match(/(\d+\.\d+)\s*\((\d+[k+]*)\)/i);
  if (ratingMatch) {
    data.rating = parseFloat(ratingMatch[1]!);
    const countStr = ratingMatch[2]!.replace('k', '000').replace('+', '');
    data.reviewCount = parseInt(countStr, 10);
  }

  // Price range from "$$" pattern
  const priceMatch = text.match(/\$\$+/);
  if (priceMatch) {
    data.priceRange = parsePriceRange(priceMatch[0]!);
  }

  // Cuisine tags — DoorDash lists them after rating e.g. "• Burgers •"
  const cuisineMatch = text.match(/DashPass\s*•\s*([^•\n]+?)(?:\s*•|$)/i);
  if (cuisineMatch) {
    data.cuisine = normalizeCuisine(cuisineMatch[1]!.trim());
  } else {
    // Try title
    const titleCuisine = text.match(/(?:American|Burgers|Pizza|Mexican|Chinese|Japanese|Thai|Indian|Italian|Mediterranean|Seafood|Turkish|Korean|Uzbek|Uyghur)/i);
    if (titleCuisine) data.cuisine = normalizeCuisine(titleCuisine[0]!);
  }

  // Location — from meta or text
  const locationMatch = html.match(/<meta[^>]+(?:og:description|description)[^>]*content="([^"]+)"/i);
  if (locationMatch) {
    const loc = locationMatch[1]!;
    const cityState = loc.match(/([A-Za-z\s]+),\s*([A-Z]{2})/);
    if (cityState) {
      data.address = { city: cityState[1]!.trim(), state: cityState[2]!, country: 'US' };
    }
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
  }

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

  // Menu items — pattern: "Name $price • % (count)" or "Name $price"
  const menuItems: ImportedMenuItem[] = [];
  // UberEats format: "Item Name $23.04 • 91% (453)"
  const itemPattern = /([A-Z][^\n$]{3,60}?)\s+\$([\d.]+)(?:\s*•\s*[\d]+%\s*\([\d,]+\))?/g;
  let itemMatch;
  const itemSeen = new Set<string>();
  while ((itemMatch = itemPattern.exec(text)) !== null) {
    const name = itemMatch[1]!.trim();
    if (itemSeen.has(name) || name.length < 3) continue;
    // Skip lines that look like category headers or navigation
    if (/^(Skip|Enter|Chevron|Heart|Menu|Rating|Star|Arrow|Search|Group|Pickup|Schedule|Opens|Closed|Featured|Picked)/i.test(name)) continue;
    itemSeen.add(name);
    menuItems.push({ name, price: parsePriceCents(itemMatch[2]!) });
  }
  data.menuItems = menuItems.slice(0, 80);

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

/**
 * Parse an MHTML file buffer and return structured restaurant data.
 * Supports DoorDash and Uber Eats formats.
 */
export function parseMhtmlRestaurant(mhtmlBuffer: Buffer): ImportedRestaurantData {
  const mhtmlContent = mhtmlBuffer.toString('utf-8');
  const { html, sourceUrl } = extractHtmlFromMhtml(mhtmlContent);
  const text = stripHtml(html);
  const source = detectSource(sourceUrl, html);

  let data: ImportedRestaurantData;

  if (source === 'doordash') {
    data = parseDoorDash(html, text);
  } else if (source === 'ubereats') {
    data = parseUberEats(html, text);
  } else {
    // Best-effort generic parse
    data = { source: 'unknown' };
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) data.name = stripHtml(titleMatch[1]!).replace(/\s*[-|].*$/, '').trim();
    data.rawText = text.slice(0, 500);
  }

  return data;
}
