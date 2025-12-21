import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  addComment,
  createPosting,
  deleteComment,
  deletePosting,
  getPosting,
  listPostings,
  toggleLike,
  updatePosting,
} from '../services/postingService';

const router = Router();

// GET /api/postings
router.get('/', async (_req, res, next) => {
  try {
    const postings = await listPostings();
    res.json(postings);
  } catch (err) {
    next(err);
  }
});

// POST /api/postings
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const { title, content, book_id } = req.body || {};

    if (!title || !content) {
      throw new AppError('title and content are required', 400);
    }

    const posting = await createPosting(userId, { title, content, book_id });
    res.status(201).json(posting);
  } catch (err) {
    next(err);
  }
});

// GET /api/postings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid posting id', 400);
    }

    const posting = await getPosting(id);
    if (!posting) {
      throw new AppError('Posting not found', 404);
    }

    res.json(posting);
  } catch (err) {
    next(err);
  }
});

// PUT /api/postings/:id
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid posting id', 400);
    }

    const posting = await updatePosting(id, userId, req.body || {});
    if (!posting) {
      throw new AppError('Posting not found', 404);
    }

    res.json(posting);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/postings/:id
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid posting id', 400);
    }

    const ok = await deletePosting(id, userId);
    if (!ok) {
      throw new AppError('Posting not found', 404);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/postings/:id/like
router.post('/:id/like', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid posting id', 400);
    }

    const { liked } = await toggleLike(id, userId);
    res.json({ liked });
  } catch (err) {
    next(err);
  }
});

// POST /api/postings/:id/comments
router.post('/:id/comments', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    const { content } = req.body || {};

    if (Number.isNaN(id)) {
      throw new AppError('Invalid posting id', 400);
    }
    if (!content) {
      throw new AppError('content is required', 400);
    }

    const comment = await addComment(id, userId, content);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new AppError('Invalid comment id', 400);
    }

    const ok = await deleteComment(id, userId);
    if (!ok) {
      throw new AppError('Comment not found', 404);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;



