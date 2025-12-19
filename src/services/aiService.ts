import { z } from 'zod';
import prisma from '../lib/prisma';
import openai from '../lib/openai';
import { AppError } from '../middleware/errorHandler';

const AiRequestSchema = z.object({
  inputType: z.enum(['isbn', 'title']),
  query: z.string().min(1),
  userContext: z.object({
    recentBooks: z
      .array(
        z.object({
          title: z.string(),
          author: z.string().optional().nullable(),
          genre: z.string().optional().nullable(),
          rating: z.number().min(1).max(5).optional(),
        }),
      )
      .optional()
      .default([]),
    preferredGenres: z.array(z.string()).optional().default([]),
    readingGoal: z.string().optional().nullable(),
  }),
});

const AiResponseSchema = z.object({
  seed: z.object({
    title: z.string().nullable(),
    author: z.string().nullable(),
    genre: z.string().nullable(),
    isbn13: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      title: z.string(),
      author: z.string().nullable(),
      genre: z.string().nullable(),
      reason: z.string(),
      keywords: z.array(z.string()),
    }),
  ),
});

export type AiRequestInput = z.infer<typeof AiRequestSchema>;

export async function generateRecommendations(rawBody: unknown) {
  const parsed = AiRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new AppError('Invalid request', 400, parsed.error.flatten());
  }

  const { inputType, query, userContext } = parsed.data;

  // Build minimal seed from DB if possible
  let seed = {
    title: null as string | null,
    author: null as string | null,
    genre: null as string | null,
    isbn13: null as string | null,
  };

  if (inputType === 'isbn') {
    const book = await prisma.book.findFirst({
      where: { isbn: query },
    });
    if (book) {
      seed = {
        title: book.title,
        author: book.author,
        genre: null,
        isbn13: query,
      };
    } else {
      seed = {
        title: null,
        author: null,
        genre: null,
        isbn13: query,
      };
    }
  } else {
    const book = await prisma.book.findFirst({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
    });
    if (book) {
      seed = {
        title: book.title,
        author: book.author,
        genre: null,
        isbn13: book.isbn ?? null,
      };
    } else {
      seed = {
        title: query,
        author: null,
        genre: null,
        isbn13: null,
      };
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    // OpenAI 사용 불가 시, 최소 구조로 빈 추천 반환
    return {
      seed,
      items: [] as unknown[],
    };
  }

  try {
    const userMessagePayload = {
      inputType,
      query,
      userContext,
      seed,
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an AI book recommender for a reading tracker app called BookLens. ' +
            'Output JSON ONLY, no additional text. ' +
            'Input: a seed book (may be partial or missing), recent favorite books, preferred genres, and a reading goal. ' +
            'Output format: { "seed": { "title": "...", "author": "...", "genre": "...", "isbn13": "..." }, "items": [ { "title": "...", "author": "...", "genre": "...", "reason": "...", "keywords": ["...","..."] } ] }. ' +
            'Rules: If the seed is incomplete, still proceed using userContext. Never invent real ISBNs; you may set isbn13 to null or empty. ' +
            'Reason should be 1-2 concise sentences in Korean. Up to 5 items.',
        },
        {
          role: 'user',
          content: JSON.stringify(userMessagePayload),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '';

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(raw);
    } catch {
      parsedResponse = null;
    }

    const validated = parsedResponse
      ? AiResponseSchema.safeParse(parsedResponse)
      : { success: false } as const;

    if (!('success' in validated) || !validated.success) {
      return {
        seed,
        items: [] as unknown[],
      };
    }

    return validated.data;
  } catch (err) {
    console.error('OpenAI error', err);
    throw new AppError('Failed to generate recommendations', 500);
  }
}


