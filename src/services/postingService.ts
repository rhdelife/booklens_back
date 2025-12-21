import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function listPostings() {
  const postings = await prisma.posting.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      book: true,
      likes: true,
      comments: {
        include: { user: true },
      },
    },
  });

  return postings.map((p: any) => ({
    id: p.id,
    user_id: p.userId,
    book_id: p.bookId ?? null,
    title: p.title,
    content: p.content,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    likes_count: p.likes.length,
    comments: p.comments.map((c: any) => ({
      id: c.id,
      user_id: c.userId,
      posting_id: c.postingId,
      content: c.content,
      created_at: c.createdAt,
      user: {
        id: c.user.id,
        name: c.user.name,
      },
    })),
    user: {
      id: p.user.id,
      name: p.user.name,
    },
    book: p.book
      ? {
          id: p.book.id,
          title: p.book.title,
          author: p.book.author,
          thumbnail: p.book.thumbnail ?? undefined,
        }
      : null,
  }));
}

export async function createPosting(userId: number, data: { title: string; content: string; book_id?: number }) {
  const posting = await prisma.posting.create({
    data: {
      userId,
      bookId: data.book_id,
      title: data.title,
      content: data.content,
    },
    include: {
      user: true,
      book: true,
      likes: true,
      comments: {
        include: { user: true },
      },
    },
  });

  // listPostings와 동일한 형식으로 변환
  return {
    id: posting.id,
    user_id: posting.userId,
    book_id: posting.bookId ?? null,
    title: posting.title,
    content: posting.content,
    created_at: posting.createdAt,
    updated_at: posting.updatedAt,
    likes_count: posting.likes.length,
    comments: posting.comments.map((c: any) => ({
      id: c.id,
      user_id: c.userId,
      posting_id: c.postingId,
      content: c.content,
      created_at: c.createdAt,
      user: {
        id: c.user.id,
        name: c.user.name,
      },
    })),
    user: {
      id: posting.user.id,
      name: posting.user.name,
    },
    book: posting.book
      ? {
          id: posting.book.id,
          title: posting.book.title,
          author: posting.book.author,
          thumbnail: posting.book.thumbnail ?? undefined,
        }
      : null,
  };
}

export async function getPosting(id: number) {
  const p = await prisma.posting.findUnique({
    where: { id },
    include: {
      user: true,
      book: true,
      likes: true,
      comments: {
        include: { user: true },
      },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    user_id: p.userId,
    book_id: p.bookId ?? null,
    title: p.title,
    content: p.content,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    likes_count: p.likes.length,
    comments: p.comments.map((c: any) => ({
      id: c.id,
      user_id: c.userId,
      posting_id: c.postingId,
      content: c.content,
      created_at: c.createdAt,
      user: {
        id: c.user.id,
        name: c.user.name,
      },
    })),
    user: {
      id: p.user.id,
      name: p.user.name,
    },
    book: p.book
      ? {
          id: p.book.id,
          title: p.book.title,
          author: p.book.author,
          thumbnail: p.book.thumbnail ?? undefined,
        }
      : null,
  };
}

export async function updatePosting(id: number, userId: number, data: { title?: string; content?: string }) {
  const existing = await prisma.posting.findUnique({ 
    where: { id },
    include: {
      user: true,
      book: true,
      likes: true,
      comments: {
        include: { user: true },
      },
    },
  });
  if (!existing || existing.userId !== userId) return null;

  const updated = await prisma.posting.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      content: data.content ?? existing.content,
    },
    include: {
      user: true,
      book: true,
      likes: true,
      comments: {
        include: { user: true },
      },
    },
  });

  // listPostings와 동일한 형식으로 변환
  return {
    id: updated.id,
    user_id: updated.userId,
    book_id: updated.bookId ?? null,
    title: updated.title,
    content: updated.content,
    created_at: updated.createdAt,
    updated_at: updated.updatedAt,
    likes_count: updated.likes.length,
    comments: updated.comments.map((c: any) => ({
      id: c.id,
      user_id: c.userId,
      posting_id: c.postingId,
      content: c.content,
      created_at: c.createdAt,
      user: {
        id: c.user.id,
        name: c.user.name,
      },
    })),
    user: {
      id: updated.user.id,
      name: updated.user.name,
    },
    book: updated.book
      ? {
          id: updated.book.id,
          title: updated.book.title,
          author: updated.book.author,
          thumbnail: updated.book.thumbnail ?? undefined,
        }
      : null,
  };
}

export async function deletePosting(id: number, userId: number) {
  const existing = await prisma.posting.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;

  await prisma.posting.delete({ where: { id } });
  return true;
}

export async function toggleLike(postingId: number, userId: number) {
  // 포스팅이 존재하는지 먼저 확인
  const posting = await prisma.posting.findUnique({
    where: { id: postingId },
  });

  if (!posting) {
    throw new AppError('Posting not found', 404);
  }

  const existing = await prisma.like.findUnique({
    where: {
      userId_postingId: { userId, postingId },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  await prisma.like.create({
    data: {
      userId,
      postingId,
    },
  });

  return { liked: true };
}

export async function addComment(postingId: number, userId: number, content: string) {
  // 포스팅이 존재하는지 먼저 확인
  const posting = await prisma.posting.findUnique({
    where: { id: postingId },
  });

  if (!posting) {
    throw new AppError('Posting not found', 404);
  }

  const comment = await prisma.comment.create({
    data: {
      postingId,
      userId,
      content,
    },
    include: {
      user: true,
    },
  });

  // listPostings와 동일한 형식으로 변환
  return {
    id: comment.id,
    user_id: comment.userId,
    posting_id: comment.postingId,
    content: comment.content,
    created_at: comment.createdAt,
    user: {
      id: comment.user.id,
      name: comment.user.name,
    },
  };
}

export async function deleteComment(id: number, userId: number) {
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;

  await prisma.comment.delete({ where: { id } });
  return true;
}


