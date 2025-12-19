import { Router } from 'express';
import { generateRecommendations } from '../services/aiService';

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

export default router;


