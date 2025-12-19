import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  saveReadingSession,
  getCalendarReadingSessions,
  getDateReadingSessions,
} from '../services/readingSessionService';

const router = Router();

// POST /api/reading-sessions/save
router.post('/save', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bookId, bookTitle, bookAuthor, bookThumbnail, pagesRead, duration, startTime } =
      req.body;

    // 필수 필드 검증
    if (!bookId || !bookTitle || !bookAuthor || pagesRead === undefined || !duration || !startTime) {
      throw new AppError('필수 필드가 누락되었습니다.', 400);
    }

    // bookId 검증 (정수이고 범위 내인지 확인)
    const bookIdNum = Number(bookId);
    if (isNaN(bookIdNum) || !Number.isInteger(bookIdNum) || bookIdNum <= 0 || bookIdNum > 2147483647) {
      console.error('[ReadingSession] Invalid bookId:', bookId, 'type:', typeof bookId);
      throw new AppError('유효하지 않은 책 ID입니다.', 400);
    }

    const result = await saveReadingSession(userId, {
      bookId: bookIdNum,
      bookTitle,
      bookAuthor,
      bookThumbnail,
      pagesRead: Number(pagesRead),
      duration: Number(duration),
      startTime,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reading-sessions/calendar
router.get('/calendar', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;

    // 유효성 검증
    if (isNaN(year) || year < 1900 || year > 2100) {
      throw new AppError('올바른 연도를 입력해주세요.', 400);
    }
    if (isNaN(month) || month < 1 || month > 12) {
      throw new AppError('올바른 월을 입력해주세요. (1-12)', 400);
    }

    const result = await getCalendarReadingSessions(userId, year, month);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reading-sessions/date
router.get('/date', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const date = req.query.date as string;

    if (!date) {
      throw new AppError('date 파라미터가 필요합니다. (YYYY-MM-DD 형식)', 400);
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new AppError('날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용해주세요.', 400);
    }

    const result = await getDateReadingSessions(userId, date);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

