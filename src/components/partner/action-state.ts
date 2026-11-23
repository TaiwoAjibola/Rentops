/**
 * Shared state contract for every partner server action: forms render
 * `error`/`success` through `useActionState` and nothing else.
 */
export type PartnerActionState = { error?: string; success?: string } | null;

export const IDLE: PartnerActionState = null;
