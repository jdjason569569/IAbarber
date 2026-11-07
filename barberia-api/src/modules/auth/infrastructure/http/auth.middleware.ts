import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { ResolveWorkspaceUseCase } from '../../application/use-cases/resolve-workspace.use-case.js';
import { NoWorkspaceError } from '../../domain/errors/no-workspace.error.js';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';

/** WhatsApp routes are called by Meta and the open-wa bot; they always use the admin workspace. */
const WHATSAPP_PREFIX = '/whatsapp/';

/**
 * Runs every app request inside its workspace:
 * - `Authorization: Bearer <token>` (admin logged in) → the admin's workspace.
 * - `X-Guest: 1` → the shared demo workspace.
 * - Nothing → 401.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly resolveWorkspace: ResolveWorkspaceUseCase) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if (
      req.method === 'OPTIONS' ||
      req.originalUrl.startsWith(WHATSAPP_PREFIX)
    ) {
      next();
      return;
    }
    try {
      const workspace = await this.resolveWorkspace.execute({
        token: bearerToken(req.headers.authorization),
        guest: req.headers['x-guest'] === '1',
      });
      WorkspaceContext.run(workspace, () => next());
    } catch (error) {
      next(toHttpError(error));
    }
  }
}

function bearerToken(header: string | undefined): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function toHttpError(error: unknown): unknown {
  if (error instanceof UnauthorizedError)
    return new UnauthorizedException(error.message);
  if (error instanceof NoWorkspaceError)
    return new ForbiddenException(error.message);
  return error;
}
