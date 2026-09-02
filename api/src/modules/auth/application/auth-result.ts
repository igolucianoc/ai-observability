export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Result of a successful authentication. The tokens are set as httpOnly
 * cookies by the presentation layer; only `user` is returned in the body.
 */
export interface AuthResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
