import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // 개발 환경에서는 상세 에러 정보 제공
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  const errorStack = err instanceof Error ? err.stack : undefined;

  return res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { message: errorMessage, stack: errorStack }),
  });
}


