import { env } from '../config/env.js';

export type PlanDescriptionInput = {
  name: string;
  highlights?: string[] | null;
  featureLabels?: string[] | null;
  managerSeats?: number | null;
  monthlyPriceCents?: number | null;
};

function cleanLines(value: string[] | null | undefined, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => String(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, limit);
}

/** Short blurb used when Gemini is not configured or the request fails. */
export function buildTemplatePlanDescription(input: PlanDescriptionInput): string {
  const name = input.name.trim() || 'This package';
  const highlights = cleanLines(input.highlights, 3);
  const features = cleanLines(input.featureLabels, 3);
  const included = highlights.length ? highlights : features;
  const seats = Math.max(1, Math.round(Number(input.managerSeats) || 1));
  const seatLabel = `${seats} manager account${seats === 1 ? '' : 's'}`;
  if (!included.length) {
    return `${name} is a Tablevera reservation package with ${seatLabel}.`;
  }
  return `${name} includes ${included.join(', ')}, plus ${seatLabel}.`;
}

async function generateWithGemini(input: PlanDescriptionInput): Promise<string> {
  const name = input.name.trim();
  const payload = JSON.stringify(
    {
      packageName: name,
      includes: cleanLines(input.highlights, 12),
      enabledFeatures: cleanLines(input.featureLabels, 12),
      managerAccounts: Math.max(1, Math.round(Number(input.managerSeats) || 1)),
      monthlyPriceCents:
        typeof input.monthlyPriceCents === 'number' ? input.monthlyPriceCents : null,
    },
    null,
    2,
  );

  const system = [
    'You write a short public blurb for a restaurant software pricing package on Tablevera.',
    'One or two sentences, under 220 characters.',
    'Use only the facts in the JSON. Do not invent prices, discounts, or features.',
    'Do not use markdown, hashtags, emoji, or quotation marks around the whole blurb.',
    'Return only the blurb text.',
  ].join(' ');

  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Write the package description:\n${payload}` }],
        },
      ],
      generationConfig: { temperature: 0.6, maxOutputTokens: 180 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini description failed (${res.status})${body ? `: ${body.slice(0, 180)}` : ''}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) throw new Error('Gemini returned an empty description');
  return text.slice(0, 400);
}

/**
 * Public pricing blurb. Uses Gemini when GEMINI_API_KEY is set; otherwise a template.
 */
export async function generatePlanPackageDescription(
  input: PlanDescriptionInput,
): Promise<string> {
  if (!input.name.trim()) throw new Error('Package name is required');
  if (!env.GEMINI_API_KEY) return buildTemplatePlanDescription(input);
  try {
    return await generateWithGemini(input);
  } catch {
    return buildTemplatePlanDescription(input);
  }
}
