import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import {
  getMe,
  login,
  signup,
  toUserResponse,
  updateProfile,
  updateProfileImage,
} from '../services/authService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    try {
      const { user, token } = await signup({ email, password, name });
      return res.status(201).json({
        user: toUserResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname ?? null,
          alias: user.alias ?? null,
          bio: user.bio ?? null,
          profileImageUrl: user.profileImageUrl ?? null,
        }),
        token,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Email already in use') {
        throw new AppError(err.message, 400);
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    try {
      const { user, token } = await login({ email, password });
      return res.json({
        user: toUserResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname ?? null,
          alias: user.alias ?? null,
          bio: user.bio ?? null,
          profileImageUrl: user.profileImageUrl ?? null,
        }),
        token,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid email or password') {
        throw new AppError(err.message, 401);
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  // JWT 기반 로그아웃은 클라이언트에서 토큰을 버리면 충분
  return res.status(204).send();
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await getMe(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return res.json({
      user: toUserResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname ?? null,
        alias: user.alias ?? null,
        bio: user.bio ?? null,
        profileImageUrl: user.profileImageUrl ?? null,
      }),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile
router.put(
  '/profile',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { name, nickname, alias, bio } = req.body || {};

      const user = await updateProfile(userId, {
        name,
        nickname,
        alias,
        bio,
      });

      return res.json({
        user: toUserResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname ?? null,
          alias: user.alias ?? null,
          bio: user.bio ?? null,
          profileImageUrl: user.profileImageUrl ?? null,
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/profile/image
router.post(
  '/profile/image',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const { profile_image_url } = req.body || {};

      const user = await updateProfileImage(userId, profile_image_url ?? null);

      return res.json({
        user: toUserResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname ?? null,
          alias: user.alias ?? null,
          bio: user.bio ?? null,
          profileImageUrl: user.profileImageUrl ?? null,
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;


