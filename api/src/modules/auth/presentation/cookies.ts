import { type CookieOptions, type Response } from 'express';
import { type AuthResult } from '../application/auth-result';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/// Refresh cookie is scoped to the refresh/logout endpoints so it is not sent
/// on every request.
const REFRESH_COOKIE_PATH = '/api/auth';

interface CookieConfig {
  secure: boolean;
  accessMaxAgeMs: number;
}

function baseOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
  };
}

export function setAuthCookies(res: Response, result: AuthResult, config: CookieConfig): void {
  res.cookie(ACCESS_COOKIE, result.accessToken, {
    ...baseOptions(config.secure),
    path: '/',
    maxAge: config.accessMaxAgeMs,
  });
  res.cookie(REFRESH_COOKIE, result.refreshToken, {
    ...baseOptions(config.secure),
    path: REFRESH_COOKIE_PATH,
    expires: result.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(secure), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(secure), path: REFRESH_COOKIE_PATH });
}
