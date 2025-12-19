import { Router } from 'express';
import { generateRecommendations, analyzeReadingTendency } from '../services/aiService';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// POST /api/ai/recommendations
router.post('/recommendations', async (req, res, next) => {
  try {
    const result = await generateRecommendations(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/reading-tendency - 독서성향 분석
router.get('/reading-tendency', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await analyzeReadingTendency(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;


