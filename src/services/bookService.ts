import prisma from '../lib/prisma';

export function toBookResponse(book: {
  id: number;
  userId: number;
  title: string;
  author: string;
  publisher: string | null;
  publishDate: string | null;
  totalPage: number;
  readPage: number;
  progress: number;
  status: string;
  startDate: string | null;
  completedDate: string | null;
  totalReadingTime: number;
  memo: string | null;
  thumbnail: string | null;
  isbn: string | null;
}) {
  return {
    id: book.id,
    user_id: book.userId,
    title: book.title,
    author: book.author,
    publisher: book.publisher ?? undefined,
    publish_date: book.publishDate ?? undefined,
    total_page: book.totalPage,
    read_page: book.readPage,
    progress: book.progress,
    status:
      book.status === 'READING'
        ? 'reading'
        : book.status === 'COMPLETED'
        ? 'completed'
        : 'not_started',
    start_date: book.startDate ?? undefined,
    completed_date: book.completedDate ?? undefined,
    total_reading_time: book.totalReadingTime,
    memo: book.memo ?? undefined,
    thumbnail: book.thumbnail ?? undefined,
    isbn: book.isbn ?? undefined,
  };
}

export async function listBooks(userId: number) {
  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
  return books.map(toBookResponse);
}

export async function createBook(
  userId: number,
  data: {
    title: string;
    author: string;
    publisher?: string;
    publish_date?: string;
    total_page: number;
    read_page?: number;
    status?: 'reading' | 'completed' | 'not_started';
    start_date?: string;
    completed_date?: string;
    memo?: string;
    thumbnail?: string;
    isbn?: string;
  },
) {
  const readPage = data.read_page ?? 0;
  const totalPage = data.total_page;

  let progress = 0;
  if (totalPage > 0) {
    progress = Math.min(100, Math.round((readPage / totalPage) * 100 * 100) / 100);
  }

  const status =
    data.status === 'completed'
      ? 'COMPLETED'
      : data.status === 'not_started'
      ? 'NOT_STARTED'
      : 'READING';

  const book = await prisma.book.create({
    data: {
      userId,
      title: data.title,
      author: data.author,
      publisher: data.publisher,
      publishDate: data.publish_date,
      totalPage,
      readPage,
      progress,
      status,
      startDate: data.start_date,
      completedDate: data.completed_date,
      memo: data.memo,
      thumbnail: data.thumbnail,
      isbn: data.isbn,
    },
  });

  return toBookResponse(book);
}

export async function getBook(userId: number, id: number) {
  const book = await prisma.book.findFirst({
    where: { id, userId },
  });
  return book ? toBookResponse(book) : null;
}

export async function updateBook(
  userId: number,
  id: number,
  data: Partial<{
    title: string;
    author: string;
    publisher: string;
    publish_date: string;
    total_page: number;
    read_page: number;
    progress: number;
    status: 'reading' | 'completed' | 'not_started';
    start_date: string;
    completed_date: string;
    total_reading_time: number;
    memo: string;
    thumbnail: string;
    isbn: string;
  }>,
) {
  const existing = await prisma.book.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return null;
  }

  const totalPage = data.total_page ?? existing.totalPage;
  const readPage = data.read_page ?? existing.readPage;

  let progress =
    data.progress ??
    (totalPage > 0
      ? Math.min(100, Math.round((readPage / totalPage) * 100 * 100) / 100)
      : existing.progress);

  const status =
    data.status === 'completed'
      ? 'COMPLETED'
      : data.status === 'not_started'
      ? 'NOT_STARTED'
      : data.status === 'reading'
      ? 'READING'
      : existing.status;

  const updated = await prisma.book.update({
    where: { id: existing.id },
    data: {
      title: data.title ?? existing.title,
      author: data.author ?? existing.author,
      publisher: data.publisher ?? existing.publisher,
      publishDate: data.publish_date ?? existing.publishDate,
      totalPage,
      readPage,
      progress,
      status,
      startDate: data.start_date ?? existing.startDate,
      completedDate: data.completed_date ?? existing.completedDate,
      totalReadingTime: data.total_reading_time ?? existing.totalReadingTime,
      memo: data.memo ?? existing.memo,
      thumbnail: data.thumbnail ?? existing.thumbnail,
      isbn: data.isbn ?? existing.isbn,
    },
  });

  return toBookResponse(updated);
}

export async function deleteBook(userId: number, id: number) {
  try {
    const existing = await prisma.book.findFirst({
      where: { id, userId },
    });
    if (!existing) return false;

    // 트랜잭션으로 관련 데이터 삭제 후 책 삭제
    await prisma.$transaction(async (tx) => {
      // 관련된 ReadingSession 삭제
      await tx.readingSession.deleteMany({
        where: { bookId: id },
      });

      // 관련된 Posting의 bookId를 null로 업데이트 (posting은 유지)
      await tx.posting.updateMany({
        where: { bookId: id },
        data: { bookId: null },
      });

      // 책 삭제
      await tx.book.delete({
        where: { id: existing.id },
      });
    });

    return true;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}



