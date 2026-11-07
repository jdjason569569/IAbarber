export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

/** Phones (push registration tokens) that receive the notifications of each workspace. */
export interface DeviceTokenRepository {
  /** Saves the token for the workspace; a token already stored moves to this workspace. */
  save(token: string, workspaceId: string, platform: string): Promise<void>;
  remove(tokens: string[]): Promise<void>;
  findByWorkspace(workspaceId: string): Promise<string[]>;
}
