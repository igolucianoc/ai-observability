import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type AuthenticatedRequestUser } from '@/infra/http/authenticated-user';
import { ok, type HttpSuccessResponse } from '@/infra/http/http-response';
import { type ProjectSummary } from '../../domain/repositories/project-read.repository';
import { ListProjectsUseCase } from '../../application/use-cases/list-projects.use-case';

@Controller('projects')
export class ListProjectsController {
  constructor(private readonly listProjects: ListProjectsUseCase) {}

  @Get()
  async handle(
    @CurrentUser() current: AuthenticatedRequestUser,
  ): Promise<HttpSuccessResponse<ProjectSummary[]>> {
    return ok(await this.listProjects.execute(current.id));
  }
}
