export const WORKSPACE_MEMBERSHIP_REPOSITORY = Symbol(
  'WORKSPACE_MEMBERSHIP_REPOSITORY',
);

/** Which workspace a logged-in user manages. */
export interface WorkspaceMembershipRepository {
  /** Workspace id of the user; null when the user is not a member of any workspace. */
  findWorkspaceOf(userId: string): Promise<string | null>;
}
