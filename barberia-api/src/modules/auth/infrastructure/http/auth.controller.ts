import { Controller, Get } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';

@Controller('auth')
export class AuthController {
  /** Role and workspace of the caller; the app uses it to confirm the session after login. */
  @Get('me')
  me() {
    const { id, role } = WorkspaceContext.current();
    return { role, workspaceId: id };
  }
}
