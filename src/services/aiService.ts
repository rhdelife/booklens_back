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

/**
 * 독서성향 분석
 * 사용자의 읽은 책들을 분석하여 독서 성향을 파악합니다.
 */
export async function analyzeReadingTendency(userId: number) {
  // 사용자의 읽은 책들 조회
  const books = await prisma.book.findMany({
    where: {
      userId,
      status: 'COMPLETED', // 완료된 책만
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 50, // 최근 50권만 분석
  });

  if (books.length === 0) {
    return {
      summary: '아직 완료한 책이 없어 독서 성향을 분석할 수 없습니다. 책을 읽고 완료해보세요!',
      preferredGenres: [],
      readingStyle: null,
      readingPattern: null,
      favoriteAuthors: [],
      readingInsights: [],
    };
  }

  // 독서 통계 계산
  const totalBooks = books.length;
  const totalPages = books.reduce((sum, book) => sum + (book.totalPage || 0), 0);
  const averagePages = totalPages > 0 ? Math.round(totalPages / totalBooks) : 0;
  const totalReadingTime = books.reduce((sum, book) => sum + book.totalReadingTime, 0);

  // 책 데이터 준비 (제목, 저자만)
  const booksData = books.map((book) => ({
    title: book.title,
    author: book.author,
  }));

  if (!process.env.OPENAI_API_KEY) {
    // OpenAI 사용 불가 시 기본 응답
    return {
      summary: `총 ${totalBooks}권의 책을 완료하셨습니다.`,
      preferredGenres: [],
      readingStyle: null,
      readingPattern: null,
      favoriteAuthors: [],
      readingInsights: [],
      stats: {
        totalBooks,
        totalPages,
        averagePages,
        totalReadingTime,
      },
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an AI reading analyst for a reading tracker app called BookLens. ' +
            'Analyze the user\'s reading history and provide insights about their reading tendency. ' +
            'Output JSON ONLY, no additional text. ' +
            'Output format: { ' +
            '"summary": "전체적인 독서 성향 요약 (한국어, 2-3문장)", ' +
            '"preferredGenres": ["장르1", "장르2"], ' +
            '"readingStyle": "독서 스타일 설명 (한국어)", ' +
            '"readingPattern": "독서 패턴 설명 (한국어)", ' +
            '"favoriteAuthors": ["저자1", "저자2"], ' +
            '"readingInsights": ["인사이트1 (한국어)", "인사이트2 (한국어)"] ' +
            '}. ' +
            'Rules: ' +
            '- 모든 텍스트는 한국어로 작성. ' +
            '- preferredGenres는 책 제목과 저자를 기반으로 추론. ' +
            '- readingStyle과 readingPattern은 책 제목과 저자 패턴을 분석하여 작성. ' +
            '- favoriteAuthors는 책 제목 목록에서 자주 등장하는 저자를 추출. ' +
            '- readingInsights는 3-5개의 구체적인 인사이트 제공. ' +
            '- 모든 배열은 최대 5개 항목.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            books: booksData,
            stats: {
              totalBooks,
              totalPages,
              averagePages,
              totalReadingTime,
            },
          }),
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

    const ReadingTendencySchema = z.object({
      summary: z.string(),
      preferredGenres: z.array(z.string()),
      readingStyle: z.string().nullable(),
      readingPattern: z.string().nullable(),
      favoriteAuthors: z.array(z.string()),
      readingInsights: z.array(z.string()),
    });

    const validated = parsedResponse
      ? ReadingTendencySchema.safeParse(parsedResponse)
      : { success: false } as const;

    if (!('success' in validated) || !validated.success) {
      // 기본 응답 반환
      return {
        summary: `총 ${totalBooks}권의 책을 완료하셨습니다.`,
        preferredGenres: [],
        readingStyle: null,
        readingPattern: null,
        favoriteAuthors: [],
        readingInsights: [],
        stats: {
          totalBooks,
          totalPages,
          averagePages,
          totalReadingTime,
        },
      };
    }

    return {
      ...validated.data,
      stats: {
        totalBooks,
        totalPages,
        averagePages,
        totalReadingTime,
      },
    };
  } catch (err) {
    console.error('OpenAI reading tendency analysis error', err);
    throw new AppError('Failed to analyze reading tendency', 500);
  }
}
