import { AsyncLocalStorage } from 'node:async_hooks';

export type WorkspaceRole = 'admin' | 'guest';

/** Data space a request works on: appointments, hours and day blocks are separated by workspace. */
export interface Workspace {
  id: string;
  role: WorkspaceRole;
}

/** Fixed ids created by docs/migrations/001_workspaces.sql. */
export const ADMIN_WORKSPACE: Workspace = {
  id: '00000000-0000-0000-0000-000000000001',
  role: 'admin',
};
export const GUEST_WORKSPACE: Workspace = {
  id: '00000000-0000-0000-0000-000000000002',
  role: 'guest',
};

const storage = new AsyncLocalStorage<Workspace>();

/**
 * Workspace of the current request, propagated with AsyncLocalStorage so the use-cases keep their
 * signatures. Set by AuthMiddleware (app requests) and the WhatsApp entry points (admin workspace).
 */
export const WorkspaceContext = {
  run<T>(workspace: Workspace, fn: () => T): T {
    return storage.run(workspace, fn);
  },

  /** Throws when called outside a workspace, so data is never read or written without an owner. */
  current(): Workspace {
    const workspace = storage.getStore();
    if (!workspace) {
      throw new Error('No workspace in the current context');
    }
    return workspace;
  },

  currentId(): string {
    return WorkspaceContext.current().id;
  },
};
