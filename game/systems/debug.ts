/**
 * The window.__game console handle is on in development, and in production
 * builds made for end-to-end tests (NEXT_PUBLIC_E2E=1). Never in real releases.
 */
export const DEBUG_HANDLE_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "1";
