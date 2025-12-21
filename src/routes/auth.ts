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
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/oauthService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

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

// GET /api/auth/google - Google OAuth 시작
router.get('/google', (_req, res) => {
  try {
    const authUrl = getGoogleAuthUrl();
    return res.redirect(authUrl);
  } catch (err) {
    console.error('Google OAuth error:', err);
    return res.status(500).json({ error: 'Failed to initialize Google OAuth' });
  }
});

// GET /api/auth/google/callback - Google OAuth 콜백
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;

    // Google OAuth 에러 처리
    if (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = error === 'access_denied' 
        ? 'Google 로그인이 취소되었습니다.'
        : `Google OAuth 에러: ${error}`;
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`;
      return res.redirect(redirectUrl);
    }

    if (!code || typeof code !== 'string') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent('인증 코드를 받을 수 없습니다.')}`;
      return res.redirect(redirectUrl);
    }

    const { user, token } = await handleGoogleCallback(code);

    // 프론트엔드로 리다이렉트 (토큰을 URL 파라미터나 쿼리로 전달)
    // 프론트엔드 도메인 가져오기
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(toUserResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname ?? null,
      alias: user.alias ?? null,
      bio: user.bio ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
    })))}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    // 에러 발생 시 프론트엔드로 에러와 함께 리다이렉트
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const errorMessage = err instanceof Error ? err.message : '인증 중 오류가 발생했습니다.';
    const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`;
    return res.redirect(redirectUrl);
  }
});

export default router;


