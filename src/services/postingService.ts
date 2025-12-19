import prisma from '../lib/prisma';

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

  return postings.map((p) => ({
    id: p.id,
    user_id: p.userId,
    book_id: p.bookId ?? null,
    title: p.title,
    content: p.content,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    likes_count: p.likes.length,
    comments: p.comments.map((c) => ({
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
  });
  return posting;
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
    comments: p.comments.map((c) => ({
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
  const existing = await prisma.posting.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;

  const updated = await prisma.posting.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      content: data.content ?? existing.content,
    },
  });

  return updated;
}

export async function deletePosting(id: number, userId: number) {
  const existing = await prisma.posting.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;

  await prisma.posting.delete({ where: { id } });
  return true;
}

export async function toggleLike(postingId: number, userId: number) {
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
  const comment = await prisma.comment.create({
    data: {
      postingId,
      userId,
      content,
    },
  });
  return comment;
}

export async function deleteComment(id: number, userId: number) {
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;

  await prisma.comment.delete({ where: { id } });
  return true;
}


