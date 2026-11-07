import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { isSupabaseConfigured } from '../../shared/supabase/supabase.provider.js';
import { ResolveWorkspaceUseCase } from './application/use-cases/resolve-workspace.use-case.js';
import { ACCESS_TOKEN_VERIFIER } from './domain/ports/access-token-verifier.port.js';
import { WORKSPACE_MEMBERSHIP_REPOSITORY } from './domain/ports/workspace-membership.repository.js';
import { DisabledAccessTokenVerifier } from './infrastructure/external/disabled-access-token-verifier.js';
import { SupabaseAccessTokenVerifier } from './infrastructure/external/supabase-access-token-verifier.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { AuthMiddleware } from './infrastructure/http/auth.middleware.js';
import { InMemoryWorkspaceMembershipRepository } from './infrastructure/persistence/in-memory-workspace-membership.repository.js';
import { SupabaseWorkspaceMembershipRepository } from './infrastructure/persistence/supabase-workspace-membership.repository.js';

@Module({
  controllers: [AuthController],
  providers: [
    ResolveWorkspaceUseCase,
    {
      provide: ACCESS_TOKEN_VERIFIER,
      useClass: isSupabaseConfigured
        ? SupabaseAccessTokenVerifier
        : DisabledAccessTokenVerifier,
    },
    {
      provide: WORKSPACE_MEMBERSHIP_REPOSITORY,
      useClass: isSupabaseConfigured
        ? SupabaseWorkspaceMembershipRepository
        : InMemoryWorkspaceMembershipRepository,
    },
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes('*path');
  }
}
