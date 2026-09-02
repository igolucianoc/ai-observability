import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { type ZodSchema, ZodError } from 'zod';

/**
 * Validates and parses request input against a Zod schema, converting parse
 * failures into a standard `400` with field-level errors.
 */
export class ZodValidationPipe<TSchema extends ZodSchema> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): TSchema['_output'] {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.flatten().fieldErrors,
        });
      }
      throw new BadRequestException({ message: 'Validation failed' });
    }
  }
}
