import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import { createToken } from './authService';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// 환경변수 검증
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error('Google OAuth 환경변수 누락:', {
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!GOOGLE_REDIRECT_URI,
  });
}

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);

/**
 * Google OAuth 인증 URL 생성
 */
export function getGoogleAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // 강제로 consent 화면 표시 (refresh token 받기 위해)
  });
}

/**
 * Google OAuth callback 처리
 * @param code Google에서 받은 authorization code
 * @returns { user, token }
 */
export async function handleGoogleCallback(code: string) {
  try {
    // Authorization code를 access token으로 교환
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Google UserInfo API로 사용자 정보 가져오기
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const userInfo = await response.json();
    const googleId = userInfo.id;
    const email = userInfo.email;
    const name = userInfo.name || '';
    const picture = userInfo.picture || null;

    if (!email) {
      throw new Error('Email not provided by Google');
    }

    // DB에서 기존 사용자 찾기 (email 또는 googleId로)
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
    });

    if (user) {
      // 기존 사용자 업데이트 (Google 정보 동기화)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          name: name || user.name,
          googleId,
          profileImageUrl: picture || user.profileImageUrl,
        },
      });
    } else {
      // 새 사용자 생성 (OAuth 사용자는 passwordHash 없음)
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          profileImageUrl: picture,
          passwordHash: null, // OAuth 사용자는 비밀번호 없음
        },
      });
    }

    const token = createToken(user);

    return { user, token };
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    // 상세 에러 정보를 로깅
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // 원본 에러를 그대로 전달하여 더 많은 정보 제공
    throw error;
  }
}

