/**
 * Base class for domain entities.
 *
 * Entities are identified by their `id` rather than their attributes.
 */
export abstract class Entity<TProps> {
  protected readonly props: TProps;
  private readonly _id: string;

  protected constructor(props: TProps, id: string) {
    this.props = props;
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  equals(entity?: Entity<TProps>): boolean {
    if (entity === this) {
      return true;
    }
    if (entity == null) {
      return false;
    }
    return this._id === entity._id;
  }
}
