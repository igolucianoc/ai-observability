/**
 * Base contract for all use cases.
 *
 * A use case represents a single user intention. Implementations must not call
 * other use cases; shared technical logic belongs in application services.
 */
export abstract class BaseUseCase<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput> | TOutput;
}
