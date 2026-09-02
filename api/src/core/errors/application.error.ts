/**
 * Base class for domain/application errors.
 *
 * Framework-agnostic: the presentation layer maps these to HTTP responses.
 */
export abstract class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
