import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * 독서 세션 저장
 */
export async function saveReadingSession(
  userId: number,
  data: {
    bookId: number;
    bookTitle: string;
    bookAuthor: string;
    bookThumbnail?: string;
    pagesRead: number;
    duration: number; // seconds
    startTime: string; // ISO string
  },
) {
  // Book이 존재하고 사용자 소유인지 확인
  const book = await prisma.book.findFirst({
    where: { id: data.bookId, userId },
  });

  if (!book) {
    throw new AppError('책을 찾을 수 없습니다.', 404);
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(startTime.getTime() + data.duration * 1000);

  // ReadingSession 생성
  const session = await prisma.readingSession.create({
    data: {
      userId,
      bookId: data.bookId,
      startTime,
      endTime,
      pagesRead: data.pagesRead,
    },
  });

  // Book의 readPage와 totalReadingTime 업데이트
  const updatedReadPage = book.readPage + data.pagesRead;
  const updatedTotalReadingTime = book.totalReadingTime + data.duration;
  const updatedProgress =
    book.totalPage > 0
      ? Math.min(100, Math.round((updatedReadPage / book.totalPage) * 100 * 100) / 100)
      : book.progress;

  await prisma.book.update({
    where: { id: book.id },
    data: {
      readPage: updatedReadPage,
      totalReadingTime: updatedTotalReadingTime,
      progress: updatedProgress,
    },
  });

  return {
    message: '독서 기록이 저장되었습니다',
  };
}

/**
 * 달력용 독서 기록 조회 (년/월)
 */
export async function getCalendarReadingSessions(
  userId: number,
  year: number,
  month: number,
) {
  // 월의 시작일과 종료일 계산
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const sessions = await prisma.readingSession.findMany({
    where: {
      userId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          thumbnail: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  // 날짜별로 그룹화
  const groupedByDate: Record<
    string,
    {
      date: string;
      totalTime: number;
      sessions: Array<{
        bookId: number;
        bookTitle: string;
        bookAuthor: string;
        bookThumbnail: string | null;
        pagesRead: number;
        duration: number;
        startTime: string;
      }>;
    }
  > = {};

  for (const session of sessions) {
    const dateStr = session.startTime.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = {
        date: dateStr,
        totalTime: 0,
        sessions: [],
      };
    }

    const duration = session.endTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : 0;

    groupedByDate[dateStr].totalTime += duration;
    groupedByDate[dateStr].sessions.push({
      bookId: session.book.id,
      bookTitle: session.book.title,
      bookAuthor: session.book.author,
      bookThumbnail: session.book.thumbnail,
      pagesRead: session.pagesRead,
      duration,
      startTime: session.startTime.toISOString(),
    });
  }

  return {
    data: groupedByDate,
  };
}

/**
 * 특정 날짜의 독서 기록 조회
 */
export async function getDateReadingSessions(userId: number, dateStr: string) {
  // 날짜 파싱 및 검증
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError('잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용해주세요.', 400);
  }

  // 해당 날짜의 시작과 끝
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const sessions = await prisma.readingSession.findMany({
    where: {
      userId,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          thumbnail: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  let totalTime = 0;
  const sessionList = sessions.map((session) => {
    const duration = session.endTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : 0;
    totalTime += duration;

    return {
      bookId: session.book.id,
      bookTitle: session.book.title,
      bookAuthor: session.book.author,
      bookThumbnail: session.book.thumbnail,
      pagesRead: session.pagesRead,
      duration,
      startTime: session.startTime.toISOString(),
    };
  });

  return {
    data: {
      date: dateStr,
      totalTime,
      sessions: sessionList,
    },
  };
}

