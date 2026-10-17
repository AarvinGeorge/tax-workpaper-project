/** Workspace ids: lowercase letters, digits and dashes, 4 to 40 characters. */
export const WORKSPACE_ID = /^[a-z0-9-]{4,40}$/;
export function isWorkspaceId(ws: unknown): ws is string {
  return typeof ws === 'string' && WORKSPACE_ID.test(ws);
}
export function assertWorkspaceId(ws: string): void {
  if (!isWorkspaceId(ws)) throw new Error('invalid workspace id');
}
