import { env } from '../config/env.js';

export type ReviewReplyDraftInput = {
  restaurantName: string;
  cuisine?: string | null;
  dinerFirstName?: string | null;
  rating: number;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  comment?: string | null;
};

function guestName(input: ReviewReplyDraftInput): string {
  const name = input.dinerFirstName?.trim();
  return name || 'there';
}

function highlightPhrase(input: ReviewReplyDraftInput): string {
  const scores = [
    { label: 'food', value: input.foodRating },
    { label: 'service', value: input.serviceRating },
    { label: 'atmosphere', value: input.atmosphereRating },
  ].filter((s) => typeof s.value === 'number') as {
    label: string;
    value: number;
  }[];

  if (scores.length === 0) {
    return input.rating >= 4
      ? 'your kind words about your visit'
      : 'taking the time to share your feedback';
  }

  const best = [...scores].sort((a, b) => b.value - a.value)[0]!;
  const worst = [...scores].sort((a, b) => a.value - b.value)[0]!;

  if (input.rating >= 4 && best.value >= 4) {
    return `your praise for our ${best.label}`;
  }
  if (input.rating <= 3 && worst.value <= 3) {
    return `your notes about our ${worst.label}`;
  }
  return 'your thoughtful feedback';
}

/** Local personalized draft when Gemini is not configured. */
export function buildTemplateReviewReply(input: ReviewReplyDraftInput): string {
  const name = guestName(input);
  const restaurant = input.restaurantName.trim() || 'our restaurant';
  const highlight = highlightPhrase(input);
  const comment = input.comment?.trim();

  if (input.rating >= 4) {
    return [
      `Hi ${name},`,
      '',
      `Thank you so much for your ${input.rating}-star review of ${restaurant}. We loved reading ${highlight}${comment ? `, especially when you wrote about “${comment.slice(0, 120)}${comment.length > 120 ? '…' : ''}”` : ''}.`,
      '',
      `It means a lot to our team. We hope to welcome you back soon.`,
      '',
      `Warmly,`,
      `The ${restaurant} team`,
    ].join('\n');
  }

  return [
    `Hi ${name},`,
    '',
    `Thank you for sharing your experience at ${restaurant}. We’re sorry it didn’t fully meet your expectations, and we appreciate ${highlight}.`,
    comment
      ? `We’ve shared your comments with the team so we can improve.`
      : `Your feedback helps us get better for the next visit.`,
    '',
    `If you’re open to giving us another chance, we’d love to host you again.`,
    '',
    `Sincerely,`,
    `The ${restaurant} team`,
  ].join('\n');
}

async function generateWithGemini(input: ReviewReplyDraftInput): Promise<string> {
  const system = [
    'You write short, warm restaurant owner replies to guest reviews.',
    'Keep the tone personal and professional, 2–4 short paragraphs.',
    'Address the guest by first name when available.',
    'Reference specific ratings or comment details when present.',
    'Do not invent facts, offers, or apologies the restaurant did not ask for.',
    'Do not use markdown, hashtags, or emoji.',
    'Sign off as the restaurant team using the restaurant name.',
  ].join(' ');

  const reviewJson = JSON.stringify(
    {
      restaurantName: input.restaurantName,
      cuisine: input.cuisine ?? null,
      dinerFirstName: input.dinerFirstName ?? null,
      overallRating: input.rating,
      foodRating: input.foodRating ?? null,
      serviceRating: input.serviceRating ?? null,
      atmosphereRating: input.atmosphereRating ?? null,
      comment: input.comment ?? null,
    },
    null,
    2,
  );

  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Write a personalized reply draft for this review:\n${reviewJson}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 350,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Gemini draft failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
    );
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned an empty draft');
  return text;
}

/**
 * Personalized review reply draft for owners/staff to edit before posting.
 * Uses Gemini when GEMINI_API_KEY is set; otherwise a templated draft.
 */
export async function generateReviewReplyDraft(
  input: ReviewReplyDraftInput,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    return buildTemplateReviewReply(input);
  }
  try {
    return await generateWithGemini(input);
  } catch {
    // Keep the product usable if the provider is down or misconfigured.
    return buildTemplateReviewReply(input);
  }
}
