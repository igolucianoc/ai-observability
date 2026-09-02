import { Injectable } from '@nestjs/common';
import { type Env, envSchema } from './env.schema';

/**
 * Typed access to validated environment variables.
 *
 * Validation happens once at construction; consumers read strongly-typed values
 * via {@link get}.
 */
@Injectable()
export class EnvService {
  private readonly env: Env;

  constructor() {
    this.env = envSchema.parse(process.env);
  }

  get<TKey extends keyof Env>(key: TKey): Env[TKey] {
    return this.env[key];
  }
}
