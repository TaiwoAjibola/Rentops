/**
 * Shared state contract for every admin server action: forms render
 * `error` / `success` through React 19 `useActionState` and nothing else.
 */
export type AdminActionState = { error?: string; success?: string } | null;

export const ADMIN_IDLE: AdminActionState = null;
