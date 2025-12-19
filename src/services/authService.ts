import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function createToken(user: { id: number; email: string }) {
  const payload = {
    userId: user.id,
    email: user.email,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    expiresIn: JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export async function signup(params: {
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw new Error('Email already in use');
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      name: params.name,
    },
  });

  const token = createToken(user);

  return { user, token };
}

export async function login(params: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: params.email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.passwordHash) {
    throw new Error('This account uses OAuth login. Please use Google to sign in.');
  }

  const ok = await bcrypt.compare(params.password, user.passwordHash);
  if (!ok) {
    throw new Error('Invalid email or password');
  }

  const token = createToken(user);

  return { user, token };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

export async function updateProfile(
  userId: number,
  data: {
    name?: string;
    nickname?: string | null;
    alias?: string | null;
    bio?: string | null;
  },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return user;
}

export async function updateProfileImage(userId: number, url: string | null) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImageUrl: url },
  });
  return user;
}

export function toUserResponse(user: {
  id: number;
  email: string;
  name: string;
  nickname: string | null;
  alias: string | null;
  bio: string | null;
  profileImageUrl: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    alias: user.alias,
    bio: user.bio,
    profile_image_url: user.profileImageUrl,
  };
}


