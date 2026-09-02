import { ApplicationError } from '@/core/errors/application.error';

/// Raised when registering an email that already exists.
export class EmailAlreadyInUseError extends ApplicationError {
  constructor() {
    super('Email already in use');
  }
}

/// Raised on login when credentials do not match. Message is deliberately
/// generic so it does not reveal whether the email exists.
export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super('Invalid email or password');
  }
}

/// Raised when a refresh token is missing, expired, revoked, or unknown.
export class InvalidRefreshTokenError extends ApplicationError {
  constructor() {
    super('Invalid or expired refresh token');
  }
}
