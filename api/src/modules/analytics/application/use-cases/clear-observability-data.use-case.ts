import { Injectable } from '@nestjs/common';
import { BaseUseCase } from '@/core/use-cases/base.use-case';
import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';

export interface ClearObservabilityDataInput {
  userId: string;
}

export interface ClearObservabilityDataResult {
  deletedTraces: number;
}

/**
 * Remove todos os dados de observabilidade (traces e sua cascata) dos projetos
 * do usuário autenticado. Os projetos são preservados; apenas os traces são
 * apagados. Escopo por usuário evita que um usuário limpe dados de outro.
 */
@Injectable()
export class ClearObservabilityDataUseCase extends BaseUseCase<
  ClearObservabilityDataInput,
  ClearObservabilityDataResult
> {
  constructor(private readonly repository: AnalyticsRepository) {
    super();
  }

  async execute(input: ClearObservabilityDataInput): Promise<ClearObservabilityDataResult> {
    const deletedTraces = await this.repository.deleteAllForUser(input.userId);
    return { deletedTraces };
  }
}
