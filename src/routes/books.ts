import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createBook, deleteBook, getBook, listBooks, updateBook } from '../services/bookService';

const router = Router();

// GET /api/books
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const books = await listBooks(userId);
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// POST /api/books
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const body = req.body || {};

    if (!body.title || !body.author || typeof body.total_page !== 'number') {
      throw new AppError('title, author, and total_page are required', 400);
    }

    const book = await createBook(userId, body);
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid book id', 400);
    }

    const book = await getBook(userId, id);
    if (!book) {
      throw new AppError('Book not found', 404);
    }

    res.json(book);
  } catch (err) {
    next(err);
  }
});

// PUT /api/books/:id
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid book id', 400);
    }

    const book = await updateBook(userId, id, req.body || {});
    if (!book) {
      throw new AppError('Book not found', 404);
    }

    res.json(book);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/books/:id
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid book id', 400);
    }

    const ok = await deleteBook(userId, id);
    if (!ok) {
      throw new AppError('Book not found', 404);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;



